module.exports = [
    {
        id: "scapia-federal", name: "Scapia Federal Bank Credit Card", bank: "Federal Bank", network: "Visa", isLTF: true, annualFee: 0, joiningFee: 0, rewardRate: "1-10%", category: "Travel",
        applyUrl: "https://www.scapia.com/", image: null,
        benefits: {
            cashback: { description: "Up to 10% on travel bookings, 1% on all other spends", details: ["Up to 10% savings on flights via Scapia app", "Up to 10% on hotels via Scapia app", "1% cashback on all other spends", "No cap on travel rewards"] },
            lounges: { airport: { domestic: 4, international: 4, perQuarter: true, description: "4 domestic + 4 international lounge visits per quarter" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "0%", description: "Zero forex markup on international spends" },
            other: ["True LTF travel card", "Zero forex markup", "Generous lounge access"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["Zero forex markup", "32 lounge visits/year", "True LTF travel card"]
    },
    {
        id: "federal-celesta", name: "Federal Bank Celesta Credit Card", bank: "Federal Bank", network: "Visa", isLTF: false, annualFee: 2499, joiningFee: 1499, rewardRate: "4X rewards", category: "Premium",
        applyUrl: "https://www.federalbank.co.in/credit-card", image: null,
        benefits: {
            cashback: { description: "4X reward points on dining, travel, and entertainment", details: ["4X reward points on dining, travel, and entertainment", "1X reward points on all other spends", "Welcome bonus of 5000 reward points", "Milestone bonus at ₹2L spend"] },
            lounges: { airport: { domestic: 4, international: 2, perYear: true, description: "4 domestic + 2 international lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "4X rewards on dining" },
            movies: { available: true, description: "4X rewards on entertainment" },
            forex: { markupFee: "2.5%", description: "2.5% forex markup" },
            other: ["Federal Bank's premium offering", "4X on lifestyle categories", "Good lounge access"]
        },
        eligibility: { minIncome: 600000, minAge: 21 }, highlights: ["4X on dining & travel", "6 lounge visits/year", "Federal Bank premium"]
    },
    {
        id: "federal-signet", name: "Federal Bank Signet Credit Card", bank: "Federal Bank", network: "Visa", isLTF: false, annualFee: 999, joiningFee: 499, rewardRate: "2X online", category: "Cashback",
        applyUrl: "https://www.federalbank.co.in/credit-card", image: null,
        benefits: {
            cashback: { description: "2X reward points on online spends", details: ["2X reward points on all online transactions", "1X reward points on all offline spends", "Welcome voucher on activation", "Quarterly milestone benefits"] },
            lounges: { airport: { domestic: 2, international: 0, perYear: true, description: "2 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Good mid-range card", "2X online rewards", "Affordable annual fee"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["2X online rewards", "Low annual fee", "Entry-level Federal"]
    }
];
