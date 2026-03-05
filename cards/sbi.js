module.exports = [
    {
        id: "sbi-cashback", name: "SBI Cashback Credit Card", bank: "SBI Card", network: "Visa", isLTF: false, annualFee: 999, joiningFee: 999, rewardRate: "1-5%", category: "Cashback",
        applyUrl: "https://www.sbicard.com/en/personal/credit-cards/cashback/sbi-card-cashback.page", image: null,
        benefits: {
            cashback: { description: "5% cashback on online spends, 1% on others", details: ["5% cashback on online spends (cap ₹5000/month)", "1% cashback on offline spends", "No minimum redemption threshold", "Cashback auto-credited"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["High online cashback rate", "Auto-credited cashback", "No redemption hassle"]
        },
        eligibility: { minIncome: 400000, minAge: 21 }, highlights: ["5% online cashback", "Auto-credit cashback", "Simple & effective"]
    },
    {
        id: "sbi-elite", name: "SBI Card ELITE", bank: "SBI Card", network: "Visa", isLTF: false, annualFee: 4999, joiningFee: 4999, rewardRate: "2-5X", category: "Premium",
        applyUrl: "https://www.sbicard.com/en/personal/credit-cards/lifestyle/sbi-card-elite.page", image: null,
        benefits: {
            cashback: { description: "5X reward points on dining and departmental stores", details: ["5X reward points on dining", "5X reward points on departmental stores and grocery", "1X on all other spends", "Welcome gift worth ₹5000"] },
            lounges: { airport: { domestic: 4, international: 2, perYear: true, description: "4 domestic + 2 international lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Complimentary golf rounds at select courses" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "5X rewards on dining + GIRF (Great Indian Restaurant Festival) benefits" },
            movies: { available: true, description: "Complimentary movie tickets via BookMyShow" },
            forex: { markupFee: "1.99%", description: "1.99% forex markup" },
            other: ["5X on dining and grocery", "Premium insurance cover", "Club Vistara Silver tier included"]
        },
        eligibility: { minIncome: 1200000, minAge: 21 }, highlights: ["5X on dining & grocery", "Club Vistara Silver", "Low forex markup"]
    },
    {
        id: "sbi-prime", name: "SBI Card PRIME", bank: "SBI Card", network: "Visa", isLTF: false, annualFee: 2999, joiningFee: 2999, rewardRate: "2-10X", category: "Premium",
        applyUrl: "https://www.sbicard.com/en/personal/credit-cards/travel-fuel/sbi-card-prime.page", image: null,
        benefits: {
            cashback: { description: "10X reward points on dining, 5X on grocery, 1X elsewhere", details: ["10X reward points on dining", "5X reward points on grocery and departmental stores", "1X reward points on all other spends", "Tripmoney welcome benefit of ₹500"] },
            lounges: { airport: { domestic: 8, international: 0, perYear: true, description: "8 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "10X rewards on dining" },
            movies: { available: true, description: "Buy 1 Get 1 on movie tickets" },
            forex: { markupFee: "1.99%", description: "1.99% forex markup" },
            other: ["10X on dining", "TripMoney benefits", "Annual fee waiver on ₹3L spend"]
        },
        eligibility: { minIncome: 600000, minAge: 21 }, highlights: ["10X on dining", "8 lounge visits", "Low forex markup"]
    },
    {
        id: "sbi-simply-click", name: "SBI SimplyClick Credit Card", bank: "SBI Card", network: "Visa", isLTF: false, annualFee: 499, joiningFee: 499, rewardRate: "1.25-10X", category: "Cashback",
        applyUrl: "https://www.sbicard.com/en/personal/credit-cards/shopping/sbi-card-simplyclick.page", image: null,
        benefits: {
            cashback: { description: "10X rewards on partner apps, 1.25% on all other spends", details: ["10X points on Amazon, Cleartrip, BookMyShow, Lenskart, Netmeds", "5X on all other online spends", "1X on all offline spends", "₹500 Amazon voucher as welcome gift"] },
            lounges: { airport: { domestic: 0, international: 0, description: "No lounge access" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: true, description: "10X rewards on BookMyShow" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Great for online shoppers", "10X on Amazon", "Low annual fee"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["10X on Amazon & partners", "Entry-level card", "₹500 welcome voucher"]
    },
    {
        id: "sbi-simplysave", name: "SBI SimplySAVE Credit Card", bank: "SBI Card", network: "Visa", isLTF: false, annualFee: 499, joiningFee: 499, rewardRate: "10X on categories", category: "Rewards",
        applyUrl: "https://www.sbicard.com/en/personal/credit-cards/shopping/sbi-card-simplysave.page", image: null,
        benefits: {
            cashback: { description: "10X rewards on dining, groceries, movies & departmental stores", details: ["10X reward points on dining, grocery, movies, dept stores", "1X reward points on all other spends", "₹500 worth reward points on annual renewal", "Redeem for gifts, vouchers, cashback"] },
            lounges: { airport: { domestic: 0, international: 0, description: "No lounge access" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "10X rewards on dining spends" },
            movies: { available: true, description: "10X rewards on movie spends" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["10X on everyday categories", "Good for daily spenders", "Low annual fee"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["10X on dining & movies", "Good for daily spends", "Low ₹499 fee"]
    },
    {
        id: "sbi-aurum", name: "SBI Card AURUM", bank: "SBI Card", network: "Visa", isLTF: false, annualFee: 9999, joiningFee: 9999, rewardRate: "3-8%", category: "Super Premium",
        applyUrl: "https://www.sbicard.com/en/personal/credit-cards/lifestyle/sbi-card-aurum.page", image: null,
        benefits: {
            cashback: { description: "8X reward points on dining and international spends", details: ["8X reward points on dining spends", "8X reward points on international transactions", "3X reward points on all other spends", "Welcome bonus of 10,000 reward points"] },
            lounges: { airport: { domestic: -1, international: 6, perYear: true, description: "Unlimited domestic + 6 international lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Complimentary golf at premium courses" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "8X rewards on all dining" },
            movies: { available: true, description: "Premium movie experiences" },
            forex: { markupFee: "1.99%", description: "1.99% forex markup" },
            other: ["Top-tier SBI Card", "8X on dining + international", "Metal card"]
        },
        eligibility: { minIncome: 2000000, minAge: 21 }, highlights: ["8X on dining & international", "Unlimited domestic lounge", "Metal card"]
    }
];
