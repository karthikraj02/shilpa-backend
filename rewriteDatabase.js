const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'services', 'imageDatabase.js');
let content = fs.readFileSync(file, 'utf8');

const replacements = {
    '"udupi": "https://images.unsplash.com/photo-1620804470381-8b0933fa1f21?q=80&w=1000",': '"udupi": "https://commons.wikimedia.org/wiki/Special:FilePath/Udupi_Sri_Krishna_Temple_3.jpg?width=1280",',
    '"malpe beach": "https://images.unsplash.com/photo-1615887023516-9dcafcbff848?q=80&w=1000",': '"malpe beach": "https://commons.wikimedia.org/wiki/Special:FilePath/Malpe_beach_2.JPG?width=1280",',
    '"mysore": "https://images.unsplash.com/photo-1582510003544-4d00b7f7415e?q=80&w=1000",': '"mysore": "https://commons.wikimedia.org/wiki/Special:FilePath/Mysore_Palace_Morning.jpg?width=1280",',
    '"mysuru": "https://images.unsplash.com/photo-1582510003544-4d00b7f7415e?q=80&w=1000",': '"mysuru": "https://commons.wikimedia.org/wiki/Special:FilePath/Mysore_Palace_Morning.jpg?width=1280",',
    '"bengaluru": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=1000",': '"bengaluru": "https://commons.wikimedia.org/wiki/Special:FilePath/Vidhana_Soudha_Bangalore.jpg?width=1280",',
    '"bangalore": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=1000",': '"bangalore": "https://commons.wikimedia.org/wiki/Special:FilePath/Vidhana_Soudha_Bangalore.jpg?width=1280",',
    '"hampi": "https://images.unsplash.com/photo-1620023455112-dbd9d68370de?q=80&w=1000",': '"hampi": "https://commons.wikimedia.org/wiki/Special:FilePath/Virupaksha_Temple_Hampi.jpg?width=1280",',
    '"goa": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=1000",': '"goa": "https://commons.wikimedia.org/wiki/Special:FilePath/Palolem_Beach.jpg?width=1280",',
    '"coorg": "https://images.unsplash.com/photo-1596429388109-847e0915fbe2?q=80&w=1000",': '"coorg": "https://commons.wikimedia.org/wiki/Special:FilePath/Abbey_Falls_Madikeri.jpg?width=1280",',
    '"madikeri": "https://images.unsplash.com/photo-1596429388109-847e0915fbe2?q=80&w=1000",': '"madikeri": "https://commons.wikimedia.org/wiki/Special:FilePath/Abbey_Falls_Madikeri.jpg?width=1280",',
    '"mangalore": "https://images.unsplash.com/photo-1629202685165-2766dcbf6cba?q=80&w=1000",': '"mangalore": "https://commons.wikimedia.org/wiki/Special:FilePath/Panambur_Beach.jpg?width=1280",',
    '"kerala": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=1000",': '"kerala": "https://commons.wikimedia.org/wiki/Special:FilePath/Munnar_hill_station.jpg?width=1280",',
    '"munnar": "https://images.unsplash.com/photo-1593693397690-362bb9a10eb1?q=80&w=1000",': '"munnar": "https://commons.wikimedia.org/wiki/Special:FilePath/Munnar_hill_station.jpg?width=1280",',
    '"ooty": "https://images.unsplash.com/photo-1570881986518-a379ea65fde6?q=80&w=1000",': '"ooty": "https://commons.wikimedia.org/wiki/Special:FilePath/Ooty_Lake.jpg?width=1280",',
    '"jaipur": "https://images.unsplash.com/photo-1477587458883-47145ed94245?q=80&w=1000",': '"jaipur": "https://commons.wikimedia.org/wiki/Special:FilePath/Amber_Fort_Jaipur.jpg?width=1280",',
    '"delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=1000",': '"delhi": "https://commons.wikimedia.org/wiki/Special:FilePath/India_Gate_in_New_Delhi.jpg?width=1280",',
    '"new delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=1000",': '"new delhi": "https://commons.wikimedia.org/wiki/Special:FilePath/India_Gate_in_New_Delhi.jpg?width=1280",',
    '"mumbai": "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?q=80&w=1000",': '"mumbai": "https://commons.wikimedia.org/wiki/Special:FilePath/Mumbai_03-2016_30_Gateway_of_India.jpg?width=1280",',
    '"default_beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000",': '"default_beach": "https://commons.wikimedia.org/wiki/Special:FilePath/Palolem_Beach.jpg?width=1280",',
    '"default_mountain": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000",': '"default_mountain": "https://commons.wikimedia.org/wiki/Special:FilePath/Munnar_hill_station.jpg?width=1280",',
    '"default_temple": "https://images.unsplash.com/photo-1582510003544-4d00b7f7415e?q=80&w=1000",': '"default_temple": "https://commons.wikimedia.org/wiki/Special:FilePath/Udupi_Sri_Krishna_Temple_3.jpg?width=1280",',
    '"default_city": "https://images.unsplash.com/photo-1477959858617-6c9224f2b5a5?q=80&w=1000",': '"default_city": "https://commons.wikimedia.org/wiki/Special:FilePath/Vidhana_Soudha_Bangalore.jpg?width=1280",',
    '"default": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1000"': '"default": "https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_(Edited).jpeg?width=1280"'
};

for (const [oldLine, newLine] of Object.entries(replacements)) {
    content = content.replace(oldLine, newLine);
}

fs.writeFileSync(file, content, 'utf8');
console.log('imageDatabase.js updated.');
