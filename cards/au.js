module.exports = [
    {
        id: "au-lit", name: "AU Bank LIT Credit Card", bank: "AU Small Finance Bank", network: "RuPay / Visa / Mastercard", isLTF: true, annualFee: 0, joiningFee: 0, rewardRate: "1-5%", category: "Customizable",
        applyUrl: "https://www.aubank.in/credit-card/lit-credit-card", image: null,
        benefits: {
            cashback: { description: "Customize your benefits - choose 3 of 7 features", details: ["Choose from: Cashback, Lounge, Movie, OTT, Dining, Travel, Shopping", "Up to 5% cashback when cashback feature is selected", "1% base cashback on all spends", "Change features every 3 months"] },
            lounges: { airport: { domestic: 4, international: 0, perQuarter: true, description: "4 domestic lounge visits per quarter (if Lounge feature selected)" }, railway: { count: 2, perQuarter: true, description: "2 railway lounge visits per quarter via RuPay" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "25% off up to ₹200 on Swiggy, Zomato (if Dining selected)" },
            movies: { available: true, description: "Buy 1 Get 1 on BookMyShow (if Movie selected)" },
            forex: { markupFee: "2.5%", description: "2.5% forex markup" },
            other: ["India's first customizable card", "Choose your own benefits", "True LTF - zero fees"]
        },
        eligibility: { minIncome: 200000, minAge: 21 }, highlights: ["Choose your benefits", "India's 1st customizable card", "True LTF"]
    },
    {
        id: "au-altura", name: "AU Bank Altura Credit Card", bank: "AU Small Finance Bank", network: "Visa", isLTF: false, annualFee: 499, joiningFee: 199, rewardRate: "2X rewards", category: "Entry Level",
        applyUrl: "https://www.aubank.in/credit-card/altura-credit-card", image: null,
        benefits: {
            cashback: { description: "2X reward points on weekend dining and grocery", details: ["2X reward points on weekend dining spends", "2X reward points on groceries", "1X reward points on all other spends", "Welcome bonus of 500 points"] },
            lounges: { airport: { domestic: 2, international: 0, perYear: true, description: "2 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "2X on weekend dining" },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Good entry-level card", "Weekend dining rewards", "Low joining fee"]
        },
        eligibility: { minIncome: 200000, minAge: 21 }, highlights: ["2X weekend dining", "Low fee ₹499", "Easy approval"]
    },
    {
        id: "au-altura-plus", name: "AU Bank Altura Plus Credit Card", bank: "AU Small Finance Bank", network: "Visa", isLTF: false, annualFee: 999, joiningFee: 499, rewardRate: "4X rewards", category: "Rewards",
        applyUrl: "https://www.aubank.in/credit-card/altura-plus-credit-card", image: null,
        benefits: {
            cashback: { description: "4X reward points on dining, travel and entertainment", details: ["4X reward points on dining spends", "4X reward points on travel bookings", "4X reward points on entertainment", "1X reward points on all other spends"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "4X on dining" },
            movies: { available: true, description: "4X on entertainment" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Mid-tier AU card", "4X on lifestyle categories", "Upgraded from Altura"]
        },
        eligibility: { minIncome: 400000, minAge: 21 }, highlights: ["4X on dining & travel", "4 lounge visits/year", "Good mid-range card"]
    },
    {
        id: "au-zenith-plus", name: "AU Bank Zenith+ Credit Card", bank: "AU Small Finance Bank", network: "Visa", isLTF: false, annualFee: 5999, joiningFee: 2999, rewardRate: "4-8X", category: "Premium",
        applyUrl: "https://www.aubank.in/credit-card/zenith-plus-credit-card", image: null,
        benefits: {
            cashback: { description: "8X reward points on dining and international spends", details: ["8X reward points on dining", "8X reward points on international transactions", "4X reward points on all other categories", "Welcome bonus of 10,000 points"] },
            lounges: { airport: { domestic: 8, international: 4, perYear: true, description: "8 domestic + 4 international lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Complimentary golf sessions at select courses" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "8X rewards + dining offers" },
            movies: { available: true, description: "Premium movie benefits" },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["AU Bank's premium card", "8X on dining + intl", "Golf access", "Low forex markup"]
        },
        eligibility: { minIncome: 1200000, minAge: 21 }, highlights: ["8X on dining & international", "Golf access", "12 lounge visits/year"]
    }
];
