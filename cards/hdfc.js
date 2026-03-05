module.exports = [
    {
        id: "hdfc-infinia", name: "HDFC Bank Infinia Credit Card", bank: "HDFC Bank", network: "Visa", isLTF: false, annualFee: 12500, joiningFee: 12500, rewardRate: "3.3%", category: "Super Premium",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/infinia-credit-card", image: null,
        benefits: {
            cashback: { description: "5 reward points per ₹150 spend = 3.3% reward rate", details: ["5 reward points per ₹150 on all spends", "10X points on SmartBuy portal (up to 33% reward rate)", "Points redeemable for flights, hotels at excellent rates", "1 point = ₹1 on SmartBuy"] },
            lounges: { airport: { domestic: -1, international: -1, description: "Unlimited domestic & international lounge access via Priority Pass" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Complimentary golf games at premium courses in India and abroad" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining privileges at ITC hotels and partner restaurants" },
            movies: { available: true, description: "Complimentary movie tickets" },
            forex: { markupFee: "2%", description: "2% forex markup on international transactions" },
            other: ["Concierge services 24/7", "Annual fee waived on ₹10L spend", "Travel insurance up to ₹2 Cr"]
        },
        eligibility: { minIncome: 1800000, minAge: 21 }, highlights: ["Best overall card in India", "Unlimited lounge access", "Golf"]
    },
    {
        id: "hdfc-diners-black", name: "HDFC Diners Club Black Credit Card", bank: "HDFC Bank", network: "Diners Club", isLTF: false, annualFee: 10000, joiningFee: 10000, rewardRate: "3.3%", category: "Super Premium",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/diners-club-black", image: null,
        benefits: {
            cashback: { description: "5 reward points per ₹150, 10X on SmartBuy", details: ["5 reward points per ₹150 on all spends", "10X on HDFC SmartBuy portal", "Reward rate matches Infinia", "Points never expire"] },
            lounges: { airport: { domestic: -1, international: -1, description: "Unlimited lounge access worldwide" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "Complimentary golf via Club Marriott" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "ITC Culinaire dining program" },
            movies: { available: true, description: "Buy 1 Get 1 on BookMyShow" },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["Infinia-level rewards", "Fee waived at ₹5L spend", "Golf + Unlimited lounge"]
        },
        eligibility: { minIncome: 1500000, minAge: 21 }, highlights: ["Infinia-level rewards", "Fee waived at ₹5L spend", "Golf + Unlimited lounge"]
    },
    {
        id: "hdfc-regalia-gold", name: "HDFC Regalia Gold Credit Card", bank: "HDFC Bank", network: "Visa", isLTF: false, annualFee: 2500, joiningFee: 2500, rewardRate: "1.3%", category: "Premium",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/regalia-gold-credit-card", image: null,
        benefits: {
            cashback: { description: "4 reward points per ₹150 spend", details: ["4 RPs per ₹150 on retail", "2X points on travel, dining", "Points redeemable on SmartBuy", "Welcome bonus of 2500 RPs"] },
            lounges: { airport: { domestic: 12, international: 6, perYear: true, description: "12 domestic + 6 international lounge visits/year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "2 complimentary golf rounds per quarter" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Good Food Trail - dining offers at premium restaurants" },
            movies: { available: false },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["Lower entry barrier than Infinia", "Good travel benefits", "Milestone rewards"]
        },
        eligibility: { minIncome: 1200000, minAge: 21 }, highlights: ["Affordable premium card", "Golf access", "12 domestic lounge visits"]
    },
    {
        id: "hdfc-regalia", name: "HDFC Regalia Credit Card", bank: "HDFC Bank", network: "Visa", isLTF: false, annualFee: 2500, joiningFee: 2500, rewardRate: "1.3%", category: "Premium",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/regalia-credit-card", image: null,
        benefits: {
            cashback: { description: "4 reward points per ₹150 spend", details: ["4 RPs per ₹150 on all retail spends", "2X points on travel bookings", "SmartBuy redemption at best rates", "Welcome bonus included"] },
            lounges: { airport: { domestic: 8, international: 4, perYear: true, description: "8 domestic + 4 international airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining offers at partner restaurants" },
            movies: { available: true, description: "Discounts on BookMyShow" },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["Complimentary insurance cover", "Annual fee waived on ₹3L spend", "Travel concierge"]
        },
        eligibility: { minIncome: 900000, minAge: 21 }, highlights: ["Popular mid-premium card", "8 domestic lounge visits", "Fee waiver at ₹3L spend"]
    },
    {
        id: "hdfc-millennia", name: "HDFC Millennia Credit Card", bank: "HDFC Bank", network: "Mastercard", isLTF: false, annualFee: 1000, joiningFee: 1000, rewardRate: "1-5%", category: "Cashback",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/millennia-credit-card", image: null,
        benefits: {
            cashback: { description: "5% cashback on Amazon, Flipkart, Swiggy via SmartBuy; 1% on all other spends", details: ["5% cashback on Amazon, Flipkart, Myntra via SmartBuy", "2.5% cashback on all online spends", "1% cashback on all offline spends", "Max cashback ₹1000/month"] },
            lounges: { airport: { domestic: 8, international: 0, perYear: true, description: "8 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false },
            movies: { available: true, description: "BookMyShow offers" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Great for online shoppers", "Fee waived on ₹1L annual spend", "EMI options available"]
        },
        eligibility: { minIncome: 400000, minAge: 21 }, highlights: ["Best for online shopping", "5% on Amazon/Flipkart", "Low annual fee"]
    },
    {
        id: "hdfc-moneyback-plus", name: "HDFC MoneyBack+ Credit Card", bank: "HDFC Bank", network: "Visa", isLTF: false, annualFee: 500, joiningFee: 500, rewardRate: "2%", category: "Cashback",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/moneyback-plus-credit-card", image: null,
        benefits: {
            cashback: { description: "2X reward points on online spends, 1X on others", details: ["2 reward points per ₹150 on online spends", "1 reward point per ₹150 on other spends", "10X points on SmartBuy", "Points convertible to cashback"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic airport lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Good starter card", "Low fee with easy waiver", "Reward points on all spends"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["Budget-friendly card", "2X online rewards", "Easy fee waiver"]
    },
    {
        id: "swiggy-hdfc", name: "Swiggy HDFC Bank Credit Card", bank: "HDFC Bank", network: "Mastercard", isLTF: false, annualFee: 500, joiningFee: 500, rewardRate: "1-10%", category: "Cashback",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/swiggy-hdfc-bank-credit-card", image: null,
        benefits: {
            cashback: { description: "10% cashback on Swiggy, 5% on online, 1% on others", details: ["10% cashback on Swiggy orders (up to ₹1500/month)", "5% cashback on online spends", "1% on offline spends", "Swiggy One membership included"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: true, description: "12 golf lessons/year via Golflan" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Swiggy One membership with free delivery" },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Free Swiggy One membership", "Great for food lovers", "12 golf lessons per year"]
        },
        eligibility: { minIncome: 300000, minAge: 21 }, highlights: ["10% Swiggy cashback", "12 golf lessons/year", "Affordable"]
    },
    {
        id: "marriott-bonvoy-hdfc", name: "Marriott Bonvoy HDFC Bank Credit Card", bank: "HDFC Bank", network: "Visa", isLTF: false, annualFee: 3000, joiningFee: 3000, rewardRate: "8 Bonvoy pts/₹150", category: "Travel",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/marriott-bonvoy-hdfc-bank-credit-card", image: null,
        benefits: {
            cashback: { description: "Earn Marriott Bonvoy points on every spend", details: ["8 Bonvoy points per ₹150 at Marriott properties", "4 Bonvoy points per ₹150 on all other spends", "1 free night award (up to 15K points) on annual renewal", "Points transferable to 40+ airline partners"] },
            lounges: { airport: { domestic: 8, international: 2, perYear: true, description: "8 domestic + 2 international lounge visits/year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Marriott dining privileges" },
            movies: { available: false },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["Complimentary Marriott Bonvoy Silver Elite status", "Free night on renewal", "Best for hotel loyalists"]
        },
        eligibility: { minIncome: 600000, minAge: 21 }, highlights: ["Earn Marriott Bonvoy points", "Free night on renewal", "Silver Elite status"]
    },
    {
        id: "hdfc-tata-neu-infinity", name: "HDFC Tata Neu Infinity Credit Card", bank: "HDFC Bank", network: "Visa", isLTF: false, annualFee: 1499, joiningFee: 1499, rewardRate: "1.5-5%", category: "Cashback",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/tata-neu-infinity-hdfc-bank-credit-card", image: null,
        benefits: {
            cashback: { description: "Up to 5% NeuCoins on Tata brands, 1.5% on others", details: ["5% NeuCoins on Tata Neu app (Croma, BigBasket, 1mg, etc.)", "1.5% NeuCoins on all other spends", "1 NeuCoin = ₹1 on Tata Neu", "7500 welcome NeuCoins on first spend"] },
            lounges: { airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic lounge visits per year" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Discounts on Tata Neu dining partners" },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["5% on Tata ecosystem", "Good for BigBasket/Croma users", "Fee waiver on ₹2L spend"]
        },
        eligibility: { minIncome: 400000, minAge: 21 }, highlights: ["5% on Tata brands", "BigBasket, Croma rewards", "Welcome NeuCoins"]
    },
    {
        id: "hdfc-freedom", name: "HDFC Freedom Credit Card", bank: "HDFC Bank", network: "Visa", isLTF: false, annualFee: 500, joiningFee: 500, rewardRate: "5X dining", category: "Lifestyle",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/freedom-credit-card", image: null,
        benefits: {
            cashback: { description: "5X reward points on dining, groceries, movies", details: ["5X points on dining spends", "5X points on grocery purchases", "5X points on movie tickets", "1X points on all other spends"] },
            lounges: { airport: { domestic: 0, international: 0, description: "No lounge access" }, railway: { count: 0, description: "No railway lounge" } },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "5X reward points on dining" },
            movies: { available: true, description: "5X reward points on movie bookings" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Best for everyday lifestyle spends", "Low annual fee", "Good for dining out"]
        },
        eligibility: { minIncome: 250000, minAge: 21 }, highlights: ["5X on dining & groceries", "Entry-level card", "Low ₹500 fee"]
    }
];
