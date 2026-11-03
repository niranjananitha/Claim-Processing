"""Vehicle catalog for the Indian market: category -> brand -> models.

Users pick a category first, then a brand and model from this catalog. Anything
not listed is entered manually with the "Other" option (stored with is_custom=True).
"""

CATEGORIES: dict[str, str] = {
    "two_wheeler": "Two Wheeler",
    "four_wheeler": "Four Wheeler",
    "cargo_truck": "Cargo Truck",
}

CATALOG: dict[str, dict[str, list[str]]] = {
    "two_wheeler": {
        "Hero": ["Splendor Plus", "HF Deluxe", "Passion Pro", "Glamour", "Xtreme 160R", "Destini 125"],
        "Honda": ["Activa 6G", "Shine", "SP 125", "Unicorn", "Dio", "Hornet 2.0"],
        "Bajaj": ["Pulsar 150", "Pulsar NS200", "Platina", "CT 110", "Avenger 220", "Dominar 400"],
        "TVS": ["Jupiter", "Apache RTR 160", "Raider 125", "Ntorq 125", "XL100", "Ronin"],
        "Royal Enfield": ["Classic 350", "Bullet 350", "Hunter 350", "Meteor 350", "Himalayan"],
        "Yamaha": ["FZ-S", "R15 V4", "MT-15", "Fascino 125", "Ray ZR"],
        "Suzuki": ["Access 125", "Burgman Street", "Gixxer", "Avenis"],
        "Ola Electric": ["S1 Pro", "S1 Air", "S1 X"],
        "Ather": ["450X", "450S", "Rizta"],
    },
    "four_wheeler": {
        "Maruti Suzuki": ["Swift", "Baleno", "Dzire", "Wagon R", "Alto K10", "Brezza", "Ertiga", "Grand Vitara", "Fronx"],
        "Hyundai": ["i20", "Grand i10 Nios", "Creta", "Venue", "Verna", "Exter", "Alcazar"],
        "Tata": ["Nexon", "Punch", "Tiago", "Altroz", "Harrier", "Safari", "Tigor"],
        "Mahindra": ["XUV700", "Scorpio-N", "Thar", "XUV 3XO", "Bolero", "XUV400"],
        "Kia": ["Seltos", "Sonet", "Carens"],
        "Toyota": ["Innova Crysta", "Innova Hycross", "Fortuner", "Glanza", "Urban Cruiser Hyryder"],
        "Honda": ["City", "Amaze", "Elevate"],
        "MG": ["Hector", "Astor", "ZS EV", "Comet EV"],
        "Skoda": ["Kushaq", "Slavia"],
        "Volkswagen": ["Taigun", "Virtus"],
        "Renault": ["Kwid", "Kiger", "Triber"],
    },
    "cargo_truck": {
        "Tata Motors": ["Ace Gold", "Intra V30", "Yodha", "Ultra T.7", "Signa 4825.TK", "LPT 1613"],
        "Ashok Leyland": ["Dost+", "Bada Dost", "Partner", "Ecomet 1615", "Boss 1415"],
        "Mahindra": ["Bolero Pik-Up", "Jeeto", "Supro Profit Truck", "Furio 7", "Blazo X 28"],
        "Eicher": ["Pro 2049", "Pro 2095", "Pro 3015", "Pro 6028"],
        "BharatBenz": ["1015R", "1617R", "2823R", "3528C"],
        "Maruti Suzuki": ["Super Carry"],
        "Piaggio": ["Ape Xtra LDX", "Porter 700"],
    },
}

OTHER = "Other"
