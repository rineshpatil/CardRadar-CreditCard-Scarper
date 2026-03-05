module.exports = [
    {
        id: "amex-platinum", name: "American Express Platinum Card", bank: "American Express", network: "American Express", isLTF: false, annualFee: 60000, joiningFee: 60000, rewardRate: "1 MR/₹50", category: "Ultra Premium",
        applyUrl: "https://www.americanexpress.com/in/credit-cards/platinum-card/", image: null,
        benefits: {
            cashback: { description: "1 Membership Rewards point per ₹50, transferable to airlines", details: ["1 MR point per ₹50 on all spends", "Transfer to 15+ airline and hotel partners", "5X MR points on travel booked with Amex Travel", "Welcome bonus of 25,000 MR points"] },
            lounges: { airport: { domestic: -1, international: -1, description: "Unlimited lounge access via Priority Pass + Amex Centurion lounges" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Access to premium golf courses worldwide" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: true, description: "Global Dining Collection - exclusive dining experiences" },
            movies: { available: true, description: "Premium entertainment access" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Metal card", "Access to Centurion lounges", "Taj Group privileges", "Entertainment access"]
        },
        eligibility: { minIncome: 5000000, minAge: 21 }, highlights: ["Centurion lounge access", "Metal card", "Taj Group privileges"]
    },
    {
        id: "amex-gold", name: "American Express Membership Rewards Card", bank: "American Express", network: "American Express", isLTF: false, annualFee: 1000, joiningFee: 1000, rewardRate: "1 MR/₹50", category: "Rewards",
        applyUrl: "https://www.americanexpress.com/in/credit-cards/gold-card/", image: null,
        benefits: {
            cashback: { description: "1 MR point per ₹50 spent", details: ["1 MR point per ₹50 on all spends", "1000 bonus MR points on spending ₹20,000 in first 90 days", "18 Karat Gold (MR) collection benefits", "Points transferable to airlines"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: true, description: "Dining offers at partner restaurants" },
            movies: { available: true, description: "Buy 1 Get 1 on movie tickets" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Affordable Amex card", "Transferable MR points", "Movie BOGO"]
        },
        eligibility: { minIncome: 600000, minAge: 21 }, highlights: ["Affordable Amex entry", "Transferable MR points", "Movie BOGO"]
    },
    {
        id: "amex-smartearn", name: "American Express SmartEarn Credit Card", bank: "American Express", network: "American Express", isLTF: false, annualFee: 495, joiningFee: 495, rewardRate: "10X on partners", category: "Cashback",
        applyUrl: "https://www.americanexpress.com/in/credit-cards/smartearn-credit-card/", image: null,
        benefits: {
            cashback: { description: "10X MR points on Flipkart, Uber, BookMyShow, Amazon", details: ["10X MR points on Flipkart and Amazon", "10X MR points on Uber and BookMyShow", "5X MR points on other online spends", "1X MR points on all else"] },
            lounges: { airport: { domestic: 0, international: 0, description: "No lounge access" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: false }, movies: { available: true, description: "10X rewards on BookMyShow" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Entry-level Amex card", "10X on popular platforms", "Low fee waived on ₹40K spend"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["10X on Amazon/Flipkart", "Entry-level Amex", "Low annual fee"]
    },
    {
        id: "amex-plat-travel", name: "American Express Platinum Travel Card", bank: "American Express", network: "American Express", isLTF: false, annualFee: 3500, joiningFee: 3500, rewardRate: "5X on travel", category: "Travel",
        applyUrl: "https://www.americanexpress.com/in/credit-cards/platinum-travel-card/", image: null,
        benefits: {
            cashback: { description: "5X MR points on domestic airlines and hotels", details: ["5X MR points on domestic airline tickets", "5X MR points on domestic hotel bookings", "1X MR points on all other spends", "Welcome bonus of 5000 MR points on ₹10K spend"] },
            lounges: { airport: { domestic: 4, international: 0, perQuarter: true, description: "4 domestic airport lounge visits per quarter" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Best for domestic travel", "16 annual lounge visits", "Travel insurance included"]
        },
        eligibility: { minIncome: 800000, minAge: 21 }, highlights: ["5X on domestic travel", "16 lounge visits/year", "Travel insurance"]
    }
];
