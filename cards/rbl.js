module.exports = [
    {
        id: "rbl-shoprite", name: "RBL Shoprite Credit Card", bank: "RBL Bank", network: "Mastercard", isLTF: true, annualFee: 0, joiningFee: 0, rewardRate: "1.5-5%", category: "Cashback",
        applyUrl: "https://www.rblbank.com/credit-cards/shoprite", image: null,
        benefits: {
            cashback: { description: "5% cashback on grocery and departmental stores, 1.5% on all else", details: ["5% cashback on grocery stores (up to ₹200/month)", "5% cashback on departmental stores", "1.5% cashback on all other spends", "No minimum spend for cashback"] },
            lounges: { airport: { domestic: 2, international: 0, perYear: true, description: "2 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: true, description: "Movie ticket offers" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Best for grocery shopping", "True LTF", "5% on groceries"]
        },
        eligibility: { minIncome: 200000, minAge: 21 }, highlights: ["5% on groceries", "True LTF", "Best for daily shopping"]
    },
    {
        id: "rbl-fun-plus", name: "RBL Fun Plus Credit Card", bank: "RBL Bank", network: "Mastercard", isLTF: false, annualFee: 500, joiningFee: 500, rewardRate: "2-5%", category: "Entertainment",
        applyUrl: "https://www.rblbank.com/credit-cards/fun-plus", image: null,
        benefits: {
            cashback: { description: "5% on entertainment, 2% on all other spends", details: ["5% cashback on movie tickets and OTT subscriptions", "5% cashback on dining out", "2% cashback on all other spends", "Monthly cashback credit"] },
            lounges: { airport: { domestic: 2, international: 0, perYear: true, description: "2 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "5% cashback on dining" },
            movies: { available: true, description: "5% cashback on movies and OTT" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Great for entertainment spends", "5% on movies and dining", "Low annual fee"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["5% on movies & OTT", "5% on dining", "Entertainment focused"]
    },
    {
        id: "rbl-icon", name: "RBL Icon Credit Card", bank: "RBL Bank", network: "Mastercard", isLTF: false, annualFee: 3500, joiningFee: 3500, rewardRate: "6X rewards", category: "Premium",
        applyUrl: "https://www.rblbank.com/credit-cards/icon", image: null,
        benefits: {
            cashback: { description: "6X reward points on all online spends", details: ["6X reward points on all online transactions", "2X reward points on all offline spends", "Points redeemable for flights, hotels, vouchers", "Welcome bonus of 8000 points"] },
            lounges: { airport: { domestic: 4, international: 2, perYear: true, description: "4 domestic + 2 international lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Complimentary golf at select courses" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining Delights program" },
            movies: { available: true, description: "Buy 1 Get 1 on movies" },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["RBL's premium card", "6X on online", "Golf + lounge access"]
        },
        eligibility: { minIncome: 900000, minAge: 21 }, highlights: ["6X online rewards", "Golf access", "6 lounge visits/year"]
    }
];
