module.exports = [
    {
        id: "amazon-pay-icici", name: "Amazon Pay ICICI Bank Credit Card", bank: "ICICI Bank", network: "Visa", isLTF: true, annualFee: 0, joiningFee: 0, rewardRate: "1-5%", category: "Cashback",
        applyUrl: "https://www.icicibank.com/card/credit-cards/amazon-pay-credit-card", image: null,
        benefits: {
            cashback: { description: "Up to 5% cashback on Amazon with Prime, 2% on Amazon without Prime, 1% on all other spends", details: ["5% cashback on Amazon.in for Prime members", "3% cashback on Amazon.in for non-Prime", "2% cashback on paying through Amazon Pay at partner merchants", "1% cashback on all other spends"] },
            lounges: { airport: { domestic: 0, international: 0, description: "No lounge access" }, railway: { count: 0, description: "No railway lounge access" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver across all fuel stations" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["No minimum spend requirement for cashback", "Cashback auto-credited as Amazon Pay balance"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["Best for Amazon shoppers", "True LTF - no conditions", "Instant cashback"]
    },
    {
        id: "icici-emeralde", name: "ICICI Emeralde Private Metal Credit Card", bank: "ICICI Bank", network: "Visa", isLTF: false, annualFee: 12000, joiningFee: 12000, rewardRate: "2-3.5%", category: "Super Premium",
        applyUrl: "https://www.icicibank.com/card/credit-cards/emeralde-credit-card", image: null,
        benefits: {
            cashback: { description: "4 reward points per ₹100, enhanced on travel", details: ["4 reward points per ₹100 on all spends", "2X points on international spends", "Points worth up to 3.5% on flight redemptions", "Welcome bonus of 25,000 points"] },
            lounges: { airport: { domestic: -1, international: -1, description: "Unlimited domestic and international lounge access via Priority Pass" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Unlimited golf via Golflan at 100+ courses" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Culinary Treats - BOGO at premium restaurants" },
            movies: { available: true, description: "Buy 1 Get 1 on BookMyShow" },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["Metal card", "Unlimited golf via Golftrip", "Unlimited lounge"]
        },
        eligibility: { minIncome: 2000000, minAge: 21 }, highlights: ["Metal card", "Unlimited golf via Golftripz", "Unlimited lounge"]
    },
    {
        id: "icici-sapphiro", name: "ICICI Sapphiro Credit Card", bank: "ICICI Bank", network: "Visa", isLTF: false, annualFee: 6500, joiningFee: 6500, rewardRate: "2-4%", category: "Premium",
        applyUrl: "https://www.icicibank.com/card/credit-cards/icici-bank-sapphiro-credit-card", image: null,
        benefits: {
            cashback: { description: "2 reward points per ₹100, 4 points on travel", details: ["2 reward points per ₹100 on all spends", "4 reward points per ₹100 on travel bookings", "Welcome bonus of 5000 points", "Milestone bonus at ₹3L spend"] },
            lounges: { airport: { domestic: 4, international: 4, perQuarter: true, description: "4 domestic + 4 international lounge visits per quarter" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Complimentary golf via Golflan partnership" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Culinary Treats dining program" },
            movies: { available: true, description: "Buy 1 Get 1 on BookMyShow" },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["Good premium card", "Generous lounge access", "Fee waived on ₹6L spend"]
        },
        eligibility: { minIncome: 1200000, minAge: 21 }, highlights: ["16 lounge visits/quarter", "Golf access", "Culinary Treats"]
    },
    {
        id: "icici-rubyx", name: "ICICI Bank Rubyx Credit Card", bank: "ICICI Bank", network: "Visa", isLTF: false, annualFee: 3000, joiningFee: 3000, rewardRate: "2 pts/₹100", category: "Premium",
        applyUrl: "https://www.icicibank.com/card/credit-cards/icici-bank-rubyx-credit-card", image: null,
        benefits: {
            cashback: { description: "2 PAYBACK points per ₹100 spent", details: ["2 PAYBACK points per ₹100 on all spends", "Bonus points on dining and entertainment", "Points redeemable for flights, hotels, merchandise", "Welcome bonus on first spend"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining discounts at partner restaurants" },
            movies: { available: true, description: "BOGO on BookMyShow" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Good mid-range premium card", "Annual fee waived on ₹2.5L spend", "Movie and dining benefits"]
        },
        eligibility: { minIncome: 600000, minAge: 21 }, highlights: ["Mid-range premium card", "Movie BOGO", "Dining discounts"]
    },
    {
        id: "icici-coral", name: "ICICI Bank Coral Credit Card", bank: "ICICI Bank", network: "Visa", isLTF: false, annualFee: 500, joiningFee: 500, rewardRate: "2 pts/₹100", category: "Lifestyle",
        applyUrl: "https://www.icicibank.com/card/credit-cards/icici-bank-coral-credit-card", image: null,
        benefits: {
            cashback: { description: "2 PAYBACK points per ₹100 on all spends", details: ["2 PAYBACK points per ₹100 on all spends", "Bonus points on dining and movies", "Redeem for vouchers and merchandise", "Welcome bonus on card activation"] },
            lounges: { airport: { domestic: 1, international: 0, perQuarter: true, description: "1 domestic airport lounge visit per quarter" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Culinary Treats dining offers" },
            movies: { available: true, description: "Buy 1 Get 1 on BookMyShow (once/month)" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Great entry-level card", "Monthly movie BOGO", "Low annual fee"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["Entry-level ICICI card", "Monthly movie BOGO", "Low ₹500 fee"]
    },
    {
        id: "icici-platinum", name: "ICICI Bank Platinum Chip Credit Card", bank: "ICICI Bank", network: "Visa", isLTF: false, annualFee: 199, joiningFee: 199, rewardRate: "2 pts/₹100", category: "Entry Level",
        applyUrl: "https://www.icicibank.com/card/credit-cards/icici-bank-platinum-credit-card", image: null,
        benefits: {
            cashback: { description: "2 PAYBACK points per ₹100 on all spends", details: ["2 PAYBACK points per ₹100", "Welcome gift voucher", "Redeem points for cashback or vouchers", "No annual fee for first year"] },
            lounges: { airport: { domestic: 0, international: 0, description: "No lounge access" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Lowest fee ICICI card", "Good for building credit", "Easy approval"]
        },
        eligibility: { minIncome: 200000, minAge: 21 }, highlights: ["Entry-level card", "Just ₹199 fee", "Build credit history"]
    },
    {
        id: "icici-mmtblack", name: "ICICI Bank MakeMyTrip Credit Card", bank: "ICICI Bank", network: "Visa", isLTF: false, annualFee: 500, joiningFee: 500, rewardRate: "1-10%", category: "Travel",
        applyUrl: "https://www.icicibank.com/card/credit-cards/makemytrip-icici-bank-credit-card", image: null,
        benefits: {
            cashback: { description: "Up to 10% on MakeMyTrip, 1.5% on all other spends", details: ["10% MyCash back on MakeMyTrip hotel bookings", "5% MyCash back on MakeMyTrip flights", "1.5% MyCash on all other spends", "₹500 MyCash on first transaction"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Best for MakeMyTrip users", "Earn MyCash on all spends", "Fee waived at ₹2L spend"]
        },
        eligibility: { minIncome: 400000, minAge: 21 }, highlights: ["10% on MakeMyTrip hotels", "Travel rewards card", "₹500 welcome MyCash"]
    }
];
