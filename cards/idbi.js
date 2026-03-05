module.exports = [
    {
        id: "idbi-euphoria", name: "IDBI Euphoria Credit Card", bank: "IDBI Bank", network: "Visa", isLTF: true, annualFee: 0, joiningFee: 0, rewardRate: "1-10%", category: "Cashback",
        applyUrl: "https://www.idbibank.in/credit-card.aspx", image: null,
        benefits: {
            cashback: { description: "10% on dining, 5% on travel, 1% on all other spends", details: ["10% cashback on dining (up to ₹500/month)", "5% cashback on travel bookings", "1% cashback on all other spends", "No joining or annual fee ever"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "10% cashback on dining" },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["True LTF card", "High dining cashback", "Good for food lovers"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["10% dining cashback", "True LTF", "5% on travel"]
    },
    {
        id: "idbi-royale", name: "IDBI Bank Royale Credit Card", bank: "IDBI Bank", network: "Visa", isLTF: false, annualFee: 2500, joiningFee: 2500, rewardRate: "2-5X", category: "Premium",
        applyUrl: "https://www.idbibank.in/credit-card.aspx", image: null,
        benefits: {
            cashback: { description: "5X reward points on travel, 2X on all other spends", details: ["5X reward points on airline and hotel bookings", "2X reward points on all other spends", "Welcome bonus of 5000 reward points", "Milestone bonus at ₹3L annual spend"] },
            lounges: { airport: { domestic: 4, international: 2, perYear: true, description: "4 domestic + 2 international lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining offers at partner restaurants" },
            movies: { available: true, description: "Movie ticket discounts" },
            forex: { markupFee: "2.5%", description: "2.5% forex markup" },
            other: ["IDBI's premium offering", "5X on travel", "Good lounge access"]
        },
        eligibility: { minIncome: 600000, minAge: 21 }, highlights: ["5X travel rewards", "6 lounge visits/year", "IDBI premium card"]
    },
    {
        id: "idbi-winnings", name: "IDBI Bank Winnings Credit Card", bank: "IDBI Bank", network: "Visa", isLTF: false, annualFee: 499, joiningFee: 99, rewardRate: "2X rewards", category: "Entry Level",
        applyUrl: "https://www.idbibank.in/credit-card.aspx", image: null,
        benefits: {
            cashback: { description: "2X reward points on online and apparel spends", details: ["2X reward points on online transactions", "2X reward points on apparel shopping", "1X reward points on all other spends", "Welcome voucher on activation"] },
            lounges: { airport: { domestic: 0, international: 0, description: "No lounge access" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Entry-level IDBI card", "2X online rewards", "Low joining fee of ₹99"]
        },
        eligibility: { minIncome: 200000, minAge: 21 }, highlights: ["Just ₹99 joining fee", "2X online rewards", "Entry-level card"]
    }
];
