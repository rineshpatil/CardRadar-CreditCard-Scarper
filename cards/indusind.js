module.exports = [
    {
        id: "indusind-tiger", name: "IndusInd Bank Tiger Credit Card", bank: "IndusInd Bank", network: "Visa", isLTF: false, annualFee: 599, joiningFee: 599, rewardRate: "1.5%", category: "Cashback",
        applyUrl: "https://www.indusind.com/in/en/personal/cards/credit-card/tiger-credit-card.html", image: null,
        benefits: {
            cashback: { description: "1.5% cashback on weekend dining and movies", details: ["1.5% cashback on weekend dining and movies", "1% cashback on all other spends", "Cashback auto-credited monthly", "No minimum spend required"] },
            lounges: { airport: { domestic: 2, international: 0, perYear: true, description: "2 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "1.5% cashback on weekend dining" },
            movies: { available: true, description: "1.5% cashback on movie tickets" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Affordable lifestyle card", "Weekend bonuses", "Easy approval"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["Weekend dining cashback", "Low ₹599 fee", "Entry-level lifestyle"]
    },
    {
        id: "indusind-legend", name: "IndusInd Bank Legend Credit Card", bank: "IndusInd Bank", network: "Visa", isLTF: false, annualFee: 10000, joiningFee: 10000, rewardRate: "1.5-3%", category: "Super Premium",
        applyUrl: "https://www.indusind.com/in/en/personal/cards/credit-card/legend-credit-card.html", image: null,
        benefits: {
            cashback: { description: "3X reward points on travel, 1.5X on all spends", details: ["3X reward points on airline and hotel bookings", "1.5X reward points on all other spends", "Points transferable to InterMiles", "Welcome bonus of 15,000 reward points"] },
            lounges: { airport: { domestic: -1, international: 6, perYear: true, description: "Unlimited domestic + 6 international lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Complimentary golf via premium golf program" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Premium dining privileges" },
            movies: { available: true, description: "Premium movie experiences" },
            forex: { markupFee: "1.8%", description: "1.8% forex markup" },
            other: ["IndusInd's top card", "Unlimited domestic lounge", "InterMiles transfer", "Golf access"]
        },
        eligibility: { minIncome: 1800000, minAge: 21 }, highlights: ["Unlimited domestic lounge", "Golf access", "InterMiles transfer"]
    },
    {
        id: "indusind-platinum-aura", name: "IndusInd Platinum Aura Edge Credit Card", bank: "IndusInd Bank", network: "Visa", isLTF: false, annualFee: 699, joiningFee: 699, rewardRate: "2X rewards", category: "Rewards",
        applyUrl: "https://www.indusind.com/in/en/personal/cards/credit-card/platinum-aura-edge.html", image: null,
        benefits: {
            cashback: { description: "2X reward points on weekend spends", details: ["2X reward points on all weekend spends", "1X reward points on weekday spends", "Points convertible to InterMiles", "No cap on weekend bonus"] },
            lounges: { airport: { domestic: 2, international: 0, perYear: true, description: "2 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: true, description: "Movie offers on weekends" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Weekend rewards card", "InterMiles conversion", "Affordable mid-tier"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["2X weekend rewards", "InterMiles eligible", "₹699 annual fee"]
    },
    {
        id: "indusind-pioneer-heritage", name: "IndusInd Bank Pioneer Heritage Credit Card", bank: "IndusInd Bank", network: "Mastercard", isLTF: false, annualFee: 2499, joiningFee: 2499, rewardRate: "2%", category: "Premium",
        applyUrl: "https://www.indusind.com/in/en/personal/cards/credit-card/pioneer-heritage-credit-card.html", image: null,
        benefits: {
            cashback: { description: "2% rewards on all categories", details: ["2% reward value on travel bookings", "2% reward value on dining spends", "2% on all other transactions", "Welcome bonus of 5000 reward points"] },
            lounges: { airport: { domestic: 4, international: 2, perYear: true, description: "4 domestic + 2 international lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Complimentary golf at select courses" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining Delights program" },
            movies: { available: true, description: "Buy 1 Get 1 on movies" },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["Premium heritage card", "Flat 2% on everything", "Golf access"]
        },
        eligibility: { minIncome: 800000, minAge: 21 }, highlights: ["Flat 2% on all spends", "Golf access", "6 lounge visits/year"]
    }
];
