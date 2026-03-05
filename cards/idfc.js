module.exports = [
    {
        id: "idfc-first-select", name: "IDFC FIRST Select Credit Card", bank: "IDFC FIRST Bank", network: "Visa", isLTF: true, annualFee: 0, joiningFee: 0, rewardRate: "3-10X", category: "Rewards",
        applyUrl: "https://www.idfcfirstbank.com/credit-card/select", image: null,
        benefits: {
            cashback: { description: "10X reward points on online spends, 3X on offline", details: ["10X rewards on online spending (up to ₹20,000/month)", "3X reward points on in-store spending", "Never-expiring reward points", "0.25% reward rate on base, up to 2.5% with multipliers"] },
            lounges: { airport: { domestic: 4, international: 0, perQuarter: true, description: "4 complimentary domestic airport lounge visits per quarter" }, railway: { count: 4, perQuarter: true, description: "4 railway lounge visits per quarter via RuPay" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: true, description: "Buy 1 Get 1 on BookMyShow" },
            forex: { markupFee: "0%", description: "Zero forex markup on international spends" },
            other: ["Zero annual/joining fee forever", "Low interest rate (0.75% per month)", "EMI on call"]
        },
        eligibility: { minIncome: 400000, minAge: 21 }, highlights: ["Zero forex markup", "Never-expiring rewards", "Railway + Airport lounge access"]
    },
    {
        id: "idfc-first-millennia", name: "IDFC FIRST Millennia Credit Card", bank: "IDFC FIRST Bank", network: "Visa", isLTF: true, annualFee: 0, joiningFee: 0, rewardRate: "3-10X", category: "Rewards",
        applyUrl: "https://www.idfcfirstbank.com/credit-card/millennia", image: null,
        benefits: {
            cashback: { description: "10X rewards on online, 3X on offline", details: ["10X rewards on online spending", "3X on offline spending", "Never-expiring rewards", "Monthly milestone bonus points"] },
            lounges: { airport: { domestic: 2, international: 0, perQuarter: true, description: "2 domestic lounge visits per quarter" }, railway: { count: 2, perQuarter: true, description: "2 railway lounge visits per quarter" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: true, description: "Buy 1 Get 1 on BookMyShow" },
            forex: { markupFee: "0%", description: "Zero forex markup" },
            other: ["True LTF", "Zero forex markup", "Good starter card"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["True LTF no conditions", "Zero forex markup", "Good starter card"]
    },
    {
        id: "idfc-first-wealth", name: "IDFC FIRST Wealth Credit Card", bank: "IDFC FIRST Bank", network: "Visa", isLTF: false, annualFee: 2500, joiningFee: 2500, rewardRate: "6-10X", category: "Premium",
        applyUrl: "https://www.idfcfirstbank.com/credit-card/wealth", image: null,
        benefits: {
            cashback: { description: "10X rewards on online, 6X on offline", details: ["10X rewards on online spending", "6X on offline spending", "Never-expiring rewards", "Milestone benefits on ₹5L spend"] },
            lounges: { airport: { domestic: 8, international: 4, perYear: true, description: "8 domestic + 4 international lounge visits per year" }, railway: { count: 4, perQuarter: true, description: "4 railway lounge visits per quarter" } },
            golf: { available: true, description: "Complimentary golf sessions" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Premium dining benefits" },
            movies: { available: true, description: "Buy 1 Get 1 on BookMyShow" },
            forex: { markupFee: "0%", description: "Zero forex markup" },
            other: ["Premium tier of IDFC FIRST", "6X minimum multiplier", "Zero forex"]
        },
        eligibility: { minIncome: 800000, minAge: 21 }, highlights: ["6X rewards minimum", "Zero forex markup", "Golf access"]
    },
    {
        id: "idfc-first-classic", name: "IDFC FIRST Classic Credit Card", bank: "IDFC FIRST Bank", network: "Visa", isLTF: true, annualFee: 0, joiningFee: 0, rewardRate: "2-6X", category: "Entry Level",
        applyUrl: "https://www.idfcfirstbank.com/credit-card/classic", image: null,
        benefits: {
            cashback: { description: "6X rewards on online, 2X on offline", details: ["6X rewards on online spending", "2X on offline spending", "Never-expiring rewards", "Easy approval process"] },
            lounges: { airport: { domestic: 0, international: 0, description: "No lounge access" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "0%", description: "Zero forex markup" },
            other: ["Entry-level LTF card", "Zero forex", "Good for building credit"]
        },
        eligibility: { minIncome: 200000, minAge: 21 }, highlights: ["Easiest LTF to get", "Zero forex markup", "Build credit history"]
    },
    {
        id: "idfc-first-wow", name: "IDFC FIRST WOW Credit Card", bank: "IDFC FIRST Bank", network: "RuPay", isLTF: true, annualFee: 0, joiningFee: 0, rewardRate: "5X rewards", category: "Entry Level",
        applyUrl: "https://www.idfcfirstbank.com/credit-card/wow", image: null,
        benefits: {
            cashback: { description: "5X rewards on categories of your choice", details: ["5X reward points on selected spending categories", "Categories can be changed monthly", "Never-expiring rewards", "Zero joining and annual fee"] },
            lounges: { airport: { domestic: 0, international: 0, description: "No lounge access" }, railway: { count: 2, perQuarter: true, description: "2 railway lounge visits per quarter via RuPay" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "0%", description: "Zero forex markup" },
            other: ["Choose your reward categories", "Railway lounge via RuPay", "Truly no-fee card"]
        },
        eligibility: { minIncome: 200000, minAge: 21 }, highlights: ["Choose reward categories", "Railway lounge access", "True LTF"]
    }
];
