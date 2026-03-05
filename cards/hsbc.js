module.exports = [
    {
        id: "hsbc-cashback", name: "HSBC Cashback Credit Card", bank: "HSBC", network: "Visa", isLTF: true, annualFee: 0, joiningFee: 0, rewardRate: "1.5%", category: "Cashback",
        applyUrl: "https://www.hsbc.co.in/credit-cards/products/cashback/", image: null,
        benefits: {
            cashback: { description: "1.5% unlimited cashback on all spends", details: ["1.5% cashback on all online spends", "1.5% cashback on all offline spends", "No cap on cashback", "Cashback auto-credited to statement"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["True LTF - unconditional", "Unlimited cashback with no cap", "Simplest cashback card"]
        },
        eligibility: { minIncome: 400000, minAge: 21 }, highlights: ["1.5% unlimited cashback", "True LTF", "No cap on rewards"]
    },
    {
        id: "hsbc-travel-one", name: "HSBC TravelOne Credit Card", bank: "HSBC", network: "Visa", isLTF: false, annualFee: 2500, joiningFee: 1500, rewardRate: "2-5%", category: "Travel",
        applyUrl: "https://www.hsbc.co.in/credit-cards/products/travelone/", image: null,
        benefits: {
            cashback: { description: "5% TravelOne points on travel, 2% on all spends", details: ["5% TravelOne points on all travel bookings", "2% TravelOne points on all other spends", "Points redeemable on any airline/hotel worldwide", "No blackout dates for redemption"] },
            lounges: { airport: { domestic: 8, international: 4, perYear: true, description: "8 domestic + 4 international lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining offers at partner restaurants" },
            movies: { available: false },
            forex: { markupFee: "0%", description: "Zero forex markup on international spends" },
            other: ["Zero forex markup", "Flexible travel redemption", "No blackout dates"]
        },
        eligibility: { minIncome: 800000, minAge: 21 }, highlights: ["Zero forex markup", "5% on travel", "Flexible redemptions"]
    },
    {
        id: "hsbc-platinum", name: "HSBC Platinum Credit Card", bank: "HSBC", network: "Visa", isLTF: false, annualFee: 1500, joiningFee: 750, rewardRate: "2X on online", category: "Rewards",
        applyUrl: "https://www.hsbc.co.in/credit-cards/products/platinum/", image: null,
        benefits: {
            cashback: { description: "2X reward points on online spends", details: ["2X reward points on online shopping", "1X reward points on all other spends", "Redeem for flights, hotel stays, and merchandise", "Welcome bonus reward points"] },
            lounges: { airport: { domestic: 2, international: 0, perQuarter: true, description: "2 domestic lounge visits per quarter" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining offers at partner restaurants" },
            movies: { available: true, description: "Movie ticket offers" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Good mid-tier card", "2X online rewards", "Affordable annual fee"]
        },
        eligibility: { minIncome: 400000, minAge: 21 }, highlights: ["2X online shopping rewards", "8 lounge visits/year", "Affordable premium"]
    },
    {
        id: "hsbc-live-plus", name: "HSBC Live+ Credit Card", bank: "HSBC", network: "Visa", isLTF: false, annualFee: 999, joiningFee: 750, rewardRate: "1.5% cashback", category: "Cashback",
        applyUrl: "https://www.hsbc.co.in/credit-cards/products/live-plus/", image: null,
        benefits: {
            cashback: { description: "1.5% cashback on all online spends", details: ["1.5% cashback on all online transactions", "Cashback on telecom, OTT, food delivery", "Auto-credited to statement", "No minimum spend required"] },
            lounges: { airport: { domestic: 0, international: 0, description: "No lounge access" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Designed for digital millennials", "Cashback on OTT subscriptions", "Easy online application"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["1.5% online cashback", "OTT subscription rewards", "Low annual fee"]
    }
];
