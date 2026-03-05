module.exports = [
    {
        id: "axis-atlas", name: "Axis Bank Atlas Credit Card", bank: "Axis Bank", network: "Visa", isLTF: false, annualFee: 5000, joiningFee: 5000, rewardRate: "2-5%", category: "Travel",
        applyUrl: "https://www.axisbank.com/retail/cards/credit-card/atlas-credit-card", image: null,
        benefits: {
            cashback: { description: "5 EDGE MILES per ₹200 on travel, 2 on others", details: ["5 EDGE MILES per ₹200 on travel merchants", "2 EDGE MILES per ₹200 on all other spends", "EDGE MILES transferable to 15+ airlines", "Welcome bonus 5000 EDGE MILES"] },
            lounges: { airport: { domestic: 8, international: 8, perYear: true, description: "8 domestic + 8 international lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Complimentary golf via PGA partnership" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining Delights program" },
            movies: { available: false },
            forex: { markupFee: "0%", description: "Zero forex markup on international spends" },
            other: ["Best travel card", "No spend criteria for lounge", "Transferable miles"]
        },
        eligibility: { minIncome: 1500000, minAge: 21 }, highlights: ["Best travel card", "No spend criteria for lounge", "Transferable miles"]
    },
    {
        id: "axis-neo", name: "Axis Bank Neo Credit Card", bank: "Axis Bank", network: "Visa", isLTF: false, annualFee: 250, joiningFee: 250, rewardRate: "1-2%", category: "Cashback",
        applyUrl: "https://www.axisbank.com/retail/cards/credit-card/neo-credit-card", image: null,
        benefits: {
            cashback: { description: "Cashback on partner brands and all spends", details: ["2% cashback at partner brands (Swiggy, Zomato, BigBasket, Blinkit)", "1% cashback on all other spends", "₹200 welcome voucher", "No minimum spend for cashback"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "2% cashback on Swiggy and Zomato" },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Great value card", "Cashback on popular apps", "Low annual fee"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["₹250 annual fee", "2% on food delivery apps", "Good starter card"]
    },
    {
        id: "axis-ace", name: "Axis Bank ACE Credit Card", bank: "Axis Bank", network: "Visa", isLTF: false, annualFee: 499, joiningFee: 499, rewardRate: "1-5%", category: "Cashback",
        applyUrl: "https://www.axisbank.com/retail/cards/credit-card/ace-credit-card", image: null,
        benefits: {
            cashback: { description: "5% on bill payments via Google Pay, 4% on Swiggy/Zomato, 1.5% on all", details: ["5% cashback on bill payments via Google Pay", "4% cashback on Swiggy and Zomato", "2% cashback on all online spends", "1.5% cashback on all other spends"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "4% cashback on Swiggy and Zomato" },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Best for bill payments", "Google Pay integration", "Fee waived on ₹2L spend"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["5% on Google Pay bills", "4% on Swiggy/Zomato", "High cashback"]
    },
    {
        id: "axis-magnus", name: "Axis Bank Magnus Credit Card", bank: "Axis Bank", network: "Visa", isLTF: false, annualFee: 12500, joiningFee: 12500, rewardRate: "12-35 pts/₹200", category: "Super Premium",
        applyUrl: "https://www.axisbank.com/retail/cards/credit-card/axis-bank-magnus-credit-card", image: null,
        benefits: {
            cashback: { description: "35 EDGE points per ₹200 on travel, 12 on others", details: ["35 EDGE REWARD points per ₹200 on travel", "12 EDGE REWARD points per ₹200 on all other spends", "Points transferable to airline miles", "Welcome bonus of 25,000 EDGE points"] },
            lounges: { airport: { domestic: -1, international: -1, description: "Unlimited domestic + international lounge access via Priority Pass" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Complimentary golf at premium courses" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining Delights premium program" },
            movies: { available: true, description: "Buy 1 Get 1 on BookMyShow" },
            forex: { markupFee: "0%", description: "Zero forex markup" },
            other: ["Top-tier Axis card", "Unlimited lounge", "Zero forex + golf", "Fee waived on ₹25L spend"]
        },
        eligibility: { minIncome: 2400000, minAge: 21 }, highlights: ["Unlimited lounge access", "Zero forex markup", "Golf + 35X travel points"]
    },
    {
        id: "axis-reserve", name: "Axis Bank Reserve Credit Card", bank: "Axis Bank", network: "Visa", isLTF: false, annualFee: 50000, joiningFee: 50000, rewardRate: "1.5-3.5%", category: "Ultra Premium",
        applyUrl: "https://www.axisbank.com/retail/cards/credit-card/reserve-credit-card", image: null,
        benefits: {
            cashback: { description: "35 EDGE points per ₹200 on travel, 15 on others", details: ["35 EDGE REWARD points per ₹200 on travel", "15 EDGE REWARD points per ₹200 on all spends", "Can transfer to 15+ airline programs", "Welcome bonus of 50,000 EDGE points"] },
            lounges: { airport: { domestic: -1, international: -1, description: "Unlimited worldwide lounge access" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Unlimited golf at partner courses" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Premium dining experiences" },
            movies: { available: true, description: "Premium movie experiences" },
            forex: { markupFee: "0%", description: "Zero forex markup" },
            other: ["Metal card", "Personal concierge", "₹1 Cr travel insurance", "Lifestyle benefits"]
        },
        eligibility: { minIncome: 5000000, minAge: 21 }, highlights: ["Ultra-premium metal card", "50K welcome bonus", "₹50K annual fee"]
    },
    {
        id: "axis-myzone", name: "Axis Bank MY Zone Credit Card", bank: "Axis Bank", network: "Visa", isLTF: false, annualFee: 500, joiningFee: 500, rewardRate: "4X on dining", category: "Lifestyle",
        applyUrl: "https://www.axisbank.com/retail/cards/credit-card/my-zone-credit-card", image: null,
        benefits: {
            cashback: { description: "4X eDGE reward points on dining, movies, shopping", details: ["4X EDGE points on dining", "4X EDGE points on movies", "4X EDGE points on apparel/shopping", "1X points on all other spends"] },
            lounges: { airport: { domestic: 2, international: 0, perYear: true, description: "2 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "4X rewards on dining" },
            movies: { available: true, description: "4X rewards on movie tickets" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Good lifestyle card", "Low fee with dining focus", "Easy approval"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["4X on dining & movies", "Entry-level lifestyle", "₹500 annual fee"]
    },
    {
        id: "flipkart-axis", name: "Flipkart Axis Bank Credit Card", bank: "Axis Bank", network: "Visa", isLTF: false, annualFee: 500, joiningFee: 500, rewardRate: "1.5-5%", category: "Cashback",
        applyUrl: "https://www.axisbank.com/retail/cards/credit-card/flipkart-axis-bank-credit-card", image: null,
        benefits: {
            cashback: { description: "5% on Flipkart, 4% on preferred partners, 1.5% on all else", details: ["5% unlimited cashback on Flipkart, Myntra, Cleartrip", "4% cashback on preferred partner merchants", "1.5% cashback on all other spends (no cap)", "Welcome vouchers worth ₹500"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false }, movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Best for Flipkart shoppers", "Unlimited 5% on Flipkart", "Fee waived on ₹2L spend"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["5% on Flipkart/Myntra", "Unlimited cashback", "No cap on rewards"]
    }
];
