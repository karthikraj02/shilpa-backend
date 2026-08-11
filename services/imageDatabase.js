const imageDatabase = {
    // Udupi & Surroundings
    "udupi": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=1280",
    "malpe beach": "https://images.unsplash.com/photo-1590528628087-0b13543eb3b4?q=80&w=1280",
    "st. mary's island": "https://images.unsplash.com/photo-1506477331477-33d5d613dccf?q=80&w=1280",
    "manipal": "https://images.unsplash.com/photo-1568228300508-3ab9a363db7a?q=80&w=1280",
    "kaup beach": "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?q=80&w=1280",
    "hasta shilpa heritage village": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1280",
    
    // Mysore & Surroundings
    "mysore": "https://commons.wikimedia.org/wiki/Special:FilePath/Mysore_Palace_Morning.jpg?width=1280",
    "mysuru": "https://commons.wikimedia.org/wiki/Special:FilePath/Mysore_Palace_Morning.jpg?width=1280",
    "chamundi hills": "https://upload.wikimedia.org/wikipedia/commons/4/4b/Chamundeshwari_Temple_Mysore.jpg",
    "brindavan gardens": "https://upload.wikimedia.org/wikipedia/commons/e/e0/Brindavan_Gardens_Mysore.jpg",
    "st. philomena's cathedral": "https://upload.wikimedia.org/wikipedia/commons/1/14/St._Philomena%27s_Church_Mysore.jpg",
    "mysore zoo": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Mysore_Zoo_Entrance.jpg",
    "srirangapatna": "https://upload.wikimedia.org/wikipedia/commons/9/91/Srirangapatna_Fort.jpg",

    // Bengaluru
    "bengaluru": "https://commons.wikimedia.org/wiki/Special:FilePath/Vidhana_Soudha_Bangalore.jpg?width=1280",
    "bangalore": "https://commons.wikimedia.org/wiki/Special:FilePath/Vidhana_Soudha_Bangalore.jpg?width=1280",
    "lalbagh": "https://upload.wikimedia.org/wikipedia/commons/8/8e/Lalbagh_Glasshouse_Bangalore.jpg",
    "cubbon park": "https://upload.wikimedia.org/wikipedia/commons/e/eb/Cubbon_Park.jpg",
    "bangalore palace": "https://upload.wikimedia.org/wikipedia/commons/3/36/Bangalore_Palace.jpg",
    "vidhana soudha": "https://upload.wikimedia.org/wikipedia/commons/1/18/Vidhana_Soudha_Bangalore.jpg",
    "iskcon": "https://upload.wikimedia.org/wikipedia/commons/8/88/ISKCON_Bangalore.jpg",

    // Hampi
    "hampi": "https://commons.wikimedia.org/wiki/Special:FilePath/Virupaksha_Temple_Hampi.jpg?width=1280",
    "virupaksha temple": "https://upload.wikimedia.org/wikipedia/commons/2/23/Virupaksha_Temple_Hampi.jpg",
    "vittala temple": "https://upload.wikimedia.org/wikipedia/commons/3/39/Vittala_Temple_Hampi.jpg",
    "stone chariot": "https://upload.wikimedia.org/wikipedia/commons/4/4e/Stone_Chariot_Hampi.jpg",
    "lotus mahal": "https://upload.wikimedia.org/wikipedia/commons/0/05/Lotus_Mahal_Hampi.jpg",
    "hemakuta hill": "https://upload.wikimedia.org/wikipedia/commons/4/42/Hemakuta_Hill_Temples.jpg",

    // Goa
    "goa": "https://commons.wikimedia.org/wiki/Special:FilePath/Palolem_Beach.jpg?width=1280",
    "calangute beach": "https://upload.wikimedia.org/wikipedia/commons/3/35/Calangute_Beach_Goa.jpg",
    "candolim beach": "https://upload.wikimedia.org/wikipedia/commons/9/91/Candolim_Beach.jpg",
    "fort aguada": "https://upload.wikimedia.org/wikipedia/commons/5/5e/Fort_Aguada_Goa.jpg",
    "dudhsagar falls": "https://upload.wikimedia.org/wikipedia/commons/2/2a/Dudhsagar_Waterfalls_Goa.jpg",
    "chapora fort": "https://upload.wikimedia.org/wikipedia/commons/7/7b/Chapora_Fort_Goa.jpg",

    // Coorg
    "coorg": "https://commons.wikimedia.org/wiki/Special:FilePath/Abbey_Falls_Madikeri.jpg?width=1280",
    "madikeri": "https://commons.wikimedia.org/wiki/Special:FilePath/Abbey_Falls_Madikeri.jpg?width=1280",
    "abbey falls": "https://upload.wikimedia.org/wikipedia/commons/1/1d/Abbey_Falls_Madikeri.jpg",
    "raja's seat": "https://upload.wikimedia.org/wikipedia/commons/e/e4/Raja%27s_Seat_Madikeri.jpg",
    "dubare elephant camp": "https://upload.wikimedia.org/wikipedia/commons/0/07/Dubare_Elephant_Camp.jpg",
    "mandalpatti peak": "https://upload.wikimedia.org/wikipedia/commons/9/93/Mandalpatti_Coorg.jpg",
    "talakaveri": "https://upload.wikimedia.org/wikipedia/commons/2/27/Talakaveri_Temple.jpg",

    // Mangalore
    "mangalore": "https://commons.wikimedia.org/wiki/Special:FilePath/Panambur_Beach.jpg?width=1280",
    "panambur beach": "https://upload.wikimedia.org/wikipedia/commons/1/17/Panambur_Beach.jpg",
    "tannirbhavi beach": "https://upload.wikimedia.org/wikipedia/commons/3/3b/Tannirbhavi_Beach.jpg",
    "kadri manjunath temple": "https://upload.wikimedia.org/wikipedia/commons/d/d4/Kadri_Manjunath_Temple.jpg",
    "pilikula biological park": "https://upload.wikimedia.org/wikipedia/commons/c/c5/Pilikula_Nisargadhama.jpg",
    "sultan battery": "https://upload.wikimedia.org/wikipedia/commons/a/a2/Sultan_Battery_Mangalore.jpg",

    // Kerala (Munnar)
    "kerala": "https://commons.wikimedia.org/wiki/Special:FilePath/Munnar_hill_station.jpg?width=1280",
    "munnar": "https://commons.wikimedia.org/wiki/Special:FilePath/Munnar_hill_station.jpg?width=1280",
    "eravikulam national park": "https://upload.wikimedia.org/wikipedia/commons/7/7b/Eravikulam_National_Park.jpg",
    "mattupetty dam": "https://upload.wikimedia.org/wikipedia/commons/a/a7/Mattupetty_Dam.jpg",
    "tea museum": "https://upload.wikimedia.org/wikipedia/commons/5/52/Tata_Tea_Museum_Munnar.jpg",
    "top station": "https://upload.wikimedia.org/wikipedia/commons/b/b2/Top_Station_Munnar.jpg",
    "echo point": "https://upload.wikimedia.org/wikipedia/commons/8/87/Echo_Point_Munnar.jpg",

    // Ooty
    "ooty": "https://commons.wikimedia.org/wiki/Special:FilePath/Ooty_Lake.jpg?width=1280",
    "ooty lake": "https://upload.wikimedia.org/wikipedia/commons/1/1b/Ooty_Lake.jpg",
    "botanical garden": "https://upload.wikimedia.org/wikipedia/commons/3/3d/Ooty_Botanical_Garden.jpg",
    "doddabetta peak": "https://upload.wikimedia.org/wikipedia/commons/c/cc/Doddabetta_Peak_Ooty.jpg",
    "rose garden": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Ooty_Rose_Garden.jpg",
    "pykara lake": "https://upload.wikimedia.org/wikipedia/commons/b/b6/Pykara_Lake.jpg",

    // Jaipur
    "jaipur": "https://commons.wikimedia.org/wiki/Special:FilePath/Amber_Fort_Jaipur.jpg?width=1280",
    "amber fort": "https://upload.wikimedia.org/wikipedia/commons/6/62/Amber_Fort_Jaipur.jpg",
    "hawa mahal": "https://upload.wikimedia.org/wikipedia/commons/a/af/Hawa_Mahal_Jaipur.jpg",
    "city palace": "https://upload.wikimedia.org/wikipedia/commons/4/4b/City_Palace_Jaipur.jpg",
    "jantar mantar": "https://upload.wikimedia.org/wikipedia/commons/4/41/Jantar_Mantar_Jaipur.jpg",
    "nahargarh fort": "https://upload.wikimedia.org/wikipedia/commons/b/be/Nahargarh_Fort_Jaipur.jpg",

    // Delhi
    "delhi": "https://commons.wikimedia.org/wiki/Special:FilePath/India_Gate_in_New_Delhi.jpg?width=1280",
    "new delhi": "https://commons.wikimedia.org/wiki/Special:FilePath/India_Gate_in_New_Delhi.jpg?width=1280",
    "red fort": "https://upload.wikimedia.org/wikipedia/commons/e/e0/Red_Fort_Delhi.jpg",
    "india gate": "https://upload.wikimedia.org/wikipedia/commons/0/09/India_Gate_in_New_Delhi.jpg",
    "qutub minar": "https://upload.wikimedia.org/wikipedia/commons/3/33/Qutub_Minar_Delhi.jpg",
    
    // Mumbai
    "mumbai": "https://commons.wikimedia.org/wiki/Special:FilePath/Mumbai_03-2016_30_Gateway_of_India.jpg?width=1280",
    "gateway of india": "https://upload.wikimedia.org/wikipedia/commons/3/3a/Mumbai_03-2016_30_Gateway_of_India.jpg",
    "marine drive": "https://upload.wikimedia.org/wikipedia/commons/c/c5/Marine_Drive_Mumbai.jpg",
    
    // FALLBACK DEFAULTS
    "default_beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1280", // Beautiful tropical beach
    "default_mountain": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1280", // Scenic mountains
    "default_temple": "https://images.unsplash.com/photo-1621841315750-bd1865a7f98c?q=80&w=1280", // Indian temple
    "default_historical": "https://images.unsplash.com/photo-1585136195228-568eb406cbbf?q=80&w=1280", // Fort / Historical
    "default": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=1280" // India generic beautiful India image
};

module.exports = imageDatabase;
