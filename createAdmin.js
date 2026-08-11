/**
 * createAdmin.js  — Fully self-contained, no local imports
 * ──────────────────────────────────────────────────────
 * Run from the /backend directory:
 *   node createAdmin.js
 *
 * Creates (or repairs) the default admin account:
 *   Email:    admin@touristassistant.com
 *   Password: Admin@123
 *   Role:     admin
 *
 * ⚠️  IMPORTANT: This script uses User.collection.insertOne() / updateOne()
 *     to bypass the Mongoose pre-save bcrypt hook and avoid double-hashing.
 * ──────────────────────────────────────────────────────
 */

// Load .env from backend directory
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Config ────────────────────────────────────────────────────────────────────
// Credentials come from the environment. Set them in backend/.env before running:
//   ADMIN_EMAIL=you@example.com
//   ADMIN_PASSWORD=<a strong, unique password>
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'admin@touristassistant.com';
const ADMIN_NAME     = process.env.ADMIN_NAME  || 'Admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
    console.error('\n[createAdmin] ADMIN_PASSWORD is not set.');
    console.error('[createAdmin] Add ADMIN_PASSWORD=<strong password> to backend/.env and run again.');
    console.error('[createAdmin] The old hardcoded default has been removed for security.\n');
    process.exit(1);
}

if (ADMIN_PASSWORD.length < 10) {
    console.error('\n[createAdmin] ADMIN_PASSWORD must be at least 10 characters.\n');
    process.exit(1);
}

// ── Inline URI normalizer (no ./db import) ────────────────────────────────────
function normalizeMongoUri(uri) {
    if (!uri) return uri;
    const dbName = process.env.MONGO_DB_NAME || 'tourist_assistant';

    // Already has a DB name in the path → return as-is
    if (/mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(uri)) return uri;

    const q = uri.indexOf('?');
    if (q === -1) return `${uri.replace(/\/$/, '')}/${dbName}`;
    const base = uri.slice(0, q).replace(/\/$/, '');
    return `${base}/${dbName}${uri.slice(q)}`;
}

// ── Minimal User schema WITHOUT pre-save hook (to avoid accidental re-hashing)
// ── NOTE: We do NOT add a bcrypt pre-save hook here because we hash manually.
const userSchema = new mongoose.Schema({
    name:         { type: String, trim: true },
    username:     { type: String, unique: true, sparse: true, trim: true },
    email:        { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    password:     { type: String },
    role:         { type: String, enum: ['admin', 'user'], default: 'user' },
    authProvider: { type: String, enum: ['local', 'google', 'apple'], default: 'local' },
    chatHistory:  { type: Array,  default: [] },
}, { timestamps: true });

// Use a unique model name to avoid conflicts with the main User model (which HAS the hook)
const AdminSetupUser = mongoose.models.AdminSetupUser ||
    mongoose.model('AdminSetupUser', userSchema, 'users'); // still targets the "users" collection

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const rawUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!rawUri) {
        console.error('\n❌  MONGO_URI is not set.');
        console.error('    Make sure backend/.env exists and contains MONGO_URI=...');
        process.exit(1);
    }

    const uri = normalizeMongoUri(rawUri);
    console.log('\n🔌  Connecting to MongoDB...');
    console.log('    URI (masked):', uri.replace(/:([^:@]+)@/, ':****@'));

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('✅  MongoDB connected.');
    console.log('    DB name:', mongoose.connection.db.databaseName, '\n');

    // ── Check if admin already exists ─────────────────────────────────────────
    const existing = await AdminSetupUser.findOne({ email: ADMIN_EMAIL });

    if (existing) {
        console.log('ℹ️   Admin account already exists in DB:');
        console.log('    Email :', existing.email);
        console.log('    Role  :', existing.role);
        console.log('    ID    :', existing._id.toString());
        console.log('    Has password:', existing.password ? 'YES' : 'NO');

        // Always reset the password to ensure it's correct and not double-hashed
        console.log('\n🔧  Resetting password and ensuring role=admin...');
        const freshHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

        await AdminSetupUser.updateOne(
            { _id: existing._id },
            { $set: { role: 'admin', password: freshHash, authProvider: 'local' } }
        );

        // ── Verify the fix ────────────────────────────────────────────────────
        const updated = await AdminSetupUser.findOne({ email: ADMIN_EMAIL });
        const match = await bcrypt.compare(ADMIN_PASSWORD, updated.password);
        console.log('✅  Password reset. Verification:', match ? 'PASS ✓' : 'FAIL ✗');

        if (!match) {
            console.error('\n❌  CRITICAL: Password verification failed after reset!');
            console.error('    Something is wrong with bcrypt or the DB write.');
            process.exit(1);
        }

        console.log('\n✅  Admin account is ready.');
        console.log('────────────────────────────────────');
        console.log('    Email   :', ADMIN_EMAIL);
        console.log('    Password: (the value from ADMIN_PASSWORD — not printed)');
        console.log('    Role    : admin');
        console.log('────────────────────────────────────');
    } else {
        // ── Create brand-new admin ────────────────────────────────────────────
        console.log('➕  No admin account found. Creating default admin...');

        // Hash password ONCE here; we use collection.insertOne() to bypass
        // the Mongoose pre-save hook (which would hash it a SECOND time).
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

        const now = new Date();
        const result = await AdminSetupUser.collection.insertOne({
            name:         ADMIN_NAME,
            username:     'admin',
            email:        ADMIN_EMAIL,
            password:     hashedPassword,
            role:         'admin',
            authProvider: 'local',
            chatHistory:  [],
            createdAt:    now,
            updatedAt:    now,
        });

        // ── Verify the new account ────────────────────────────────────────────
        const created = await AdminSetupUser.findById(result.insertedId);
        const match = await bcrypt.compare(ADMIN_PASSWORD, created.password);
        console.log('✅  Admin created. Password verification:', match ? 'PASS ✓' : 'FAIL ✗');

        if (!match) {
            console.error('\n❌  CRITICAL: Password verification failed after creation!');
            process.exit(1);
        }

        console.log('\n✅  Default admin created successfully!');
        console.log('────────────────────────────────────');
        console.log('    Email   :', ADMIN_EMAIL);
        console.log('    Password: (the value from ADMIN_PASSWORD — not printed)');
        console.log('    Role    : admin');
        console.log('    ID      :', result.insertedId.toString());
        console.log('────────────────────────────────────');
    }

    await mongoose.disconnect();
    console.log('\n🔌  Disconnected. Done.\n');
    process.exit(0);
}

main().catch((err) => {
    console.error('\n❌  Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
});
