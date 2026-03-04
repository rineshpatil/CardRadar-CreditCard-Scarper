/**
 * Credit Card Knowledge Base
 * Curated database of popular Indian credit cards with detailed benefits
 * Data sourced from official bank websites
 */

const CREDIT_CARDS = [
    // ===== LIFETIME FREE (LTF) CARDS =====
    {
        id: "amazon-pay-icici",
        name: "Amazon Pay ICICI Bank Credit Card",
        bank: "ICICI Bank",
        network: "Visa",
        isLTF: true,
        annualFee: 0,
        joiningFee: 0,
        rewardRate: "1-5%",
        category: "Cashback",
        applyUrl: "https://www.icicibank.com/card/credit-cards/amazon-pay-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "Up to 5% cashback on Amazon with Prime, 2% on Amazon without Prime, 1% on all other spends",
                details: [
                    "5% cashback on Amazon.in for Prime members",
                    "3% cashback on Amazon.in for non-Prime",
                    "2% cashback on paying through Amazon Pay at partner merchants",
                    "1% cashback on all other spends"
                ]
            },
            lounges: {
                airport: { domestic: 0, international: 0, description: "No lounge access" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver across all fuel stations" },
            dining: { available: false },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["No minimum spend requirement for cashback", "Cashback auto-credited as Amazon Pay balance"]
        },
        eligibility: { minIncome: 300000, minAge: 21 },
        highlights: ["Best for Amazon shoppers", "True LTF - no conditions", "Instant cashback"]
    },
    {
        id: "idfc-first-select",
        name: "IDFC FIRST Select Credit Card",
        bank: "IDFC FIRST Bank",
        network: "Visa",
        isLTF: true,
        annualFee: 0,
        joiningFee: 0,
        rewardRate: "3-10X",
        category: "Rewards",
        applyUrl: "https://www.idfcfirstbank.com/credit-card/select",
        image: null,
        benefits: {
            cashback: {
                description: "10X reward points on online spends, 3X on offline",
                details: [
                    "10X rewards on online spending (up to ₹20,000/month)",
                    "3X reward points on in-store spending",
                    "Never-expiring reward points",
                    "0.25% reward rate on base, up to 2.5% with multipliers"
                ]
            },
            lounges: {
                airport: { domestic: 4, international: 0, perQuarter: true, description: "4 complimentary domestic airport lounge visits per quarter" },
                railway: { count: 4, perQuarter: true, description: "4 railway lounge visits per quarter via RuPay" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false },
            movies: { available: true, description: "Buy 1 Get 1 on BookMyShow" },
            forex: { markupFee: "0%", description: "Zero forex markup on international spends" },
            other: ["Zero annual/joining fee forever", "Low interest rate (0.75% per month)", "EMI on call"]
        },
        eligibility: { minIncome: 400000, minAge: 21 },
        highlights: ["Zero forex markup", "Never-expiring rewards", "Railway + Airport lounge access"]
    },
    {
        id: "idfc-first-millennia",
        name: "IDFC FIRST Millennia Credit Card",
        bank: "IDFC FIRST Bank",
        network: "Visa",
        isLTF: true,
        annualFee: 0,
        joiningFee: 0,
        rewardRate: "3-10X",
        category: "Rewards",
        applyUrl: "https://www.idfcfirstbank.com/credit-card/millennia",
        image: null,
        benefits: {
            cashback: {
                description: "10X reward points on online spends",
                details: [
                    "10X rewards on online spending (capped at ₹20,000/month)",
                    "3X reward points for in-store spends",
                    "Never-expiring reward points"
                ]
            },
            lounges: {
                airport: { domestic: 2, international: 0, perQuarter: true, description: "2 domestic airport lounge visits per quarter" },
                railway: { count: 4, perQuarter: true, description: "4 railway lounge visits per quarter" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false },
            movies: { available: false },
            forex: { markupFee: "0%", description: "Zero forex markup" },
            other: ["Zero annual/joining fee forever", "Low interest rate"]
        },
        eligibility: { minIncome: 300000, minAge: 21 },
        highlights: ["Entry-level LTF", "Zero forex markup", "Railway lounge access"]
    },
    {
        id: "idfc-first-wealth",
        name: "IDFC FIRST Wealth Credit Card",
        bank: "IDFC FIRST Bank",
        network: "Visa",
        isLTF: true,
        annualFee: 0,
        joiningFee: 0,
        rewardRate: "6-10X",
        category: "Premium",
        applyUrl: "https://www.idfcfirstbank.com/credit-card/wealth",
        image: null,
        benefits: {
            cashback: {
                description: "6X-10X reward points with never-expiring points",
                details: [
                    "10X rewards on online spending",
                    "6X rewards at POS",
                    "Never-expiring reward points",
                    "High redemption value"
                ]
            },
            lounges: {
                airport: { domestic: 8, international: 4, perQuarter: true, description: "8 domestic + 4 international airport lounge per quarter" },
                railway: { count: 4, perQuarter: true, description: "4 railway lounge visits per quarter" }
            },
            golf: { available: true, description: "Complimentary golf lessons through Mastercard World benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining privileges at partner restaurants" },
            movies: { available: true, description: "Buy 1 Get 1 on BookMyShow" },
            forex: { markupFee: "0%", description: "Zero forex markup" },
            other: ["Complimentary roadside assistance", "Zero annual fee forever", "Concierge services"]
        },
        eligibility: { minIncome: 1800000, minAge: 21 },
        highlights: ["Premium LTF card", "Golf + Lounge access", "Zero forex", "Roadside assistance"]
    },
    {
        id: "au-lit",
        name: "AU Bank LIT Credit Card",
        bank: "AU Small Finance Bank",
        network: "Multiple",
        isLTF: true,
        annualFee: 0,
        joiningFee: 0,
        rewardRate: "Up to 5%",
        category: "Customizable",
        applyUrl: "https://www.aubank.in/credit-card/lit-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "Customizable reward categories - choose your own benefits",
                details: [
                    "Choose 3 benefit categories from 7 options",
                    "Categories: Grocery, Utility, Shopping, Travel, Entertainment, Dining, Fuel",
                    "Accelerated rewards in chosen categories",
                    "Switch categories every month"
                ]
            },
            lounges: {
                airport: { domestic: 4, international: 0, perQuarter: false, description: "4 domestic airport lounge visits per year" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Available as customizable category" },
            movies: { available: true, description: "Movie discounts available" },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["Fully customizable rewards", "Switch categories monthly", "Zero joining fee"]
        },
        eligibility: { minIncome: 250000, minAge: 21 },
        highlights: ["Customizable benefits", "Choose your reward categories", "True LTF"]
    },
    {
        id: "scapia-federal",
        name: "Scapia Federal Bank Credit Card",
        bank: "Federal Bank",
        network: "Visa",
        isLTF: true,
        annualFee: 0,
        joiningFee: 0,
        rewardRate: "Up to 10%",
        category: "Travel",
        applyUrl: "https://www.scapia.com/",
        image: null,
        benefits: {
            cashback: {
                description: "Earn Scapia coins redeemable for travel bookings",
                details: [
                    "10% instant discount on hotel bookings via Scapia app",
                    "Coins earned on every spend, redeemable for flights & hotels",
                    "No foreign transaction charges"
                ]
            },
            lounges: {
                airport: { domestic: -1, international: 0, description: "Unlimited domestic airport lounge access (spend-based)" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: false },
            movies: { available: false },
            forex: { markupFee: "0%", description: "Zero forex markup - best for international travel" },
            other: ["Zero forex markup", "Travel-focused rewards", "Instant hotel discounts"]
        },
        eligibility: { minIncome: 300000, minAge: 21 },
        highlights: ["Best travel LTF card", "Zero forex", "Unlimited domestic lounge (spend-based)"]
    },
    {
        id: "axis-neo",
        name: "Axis Bank Neo Credit Card",
        bank: "Axis Bank",
        network: "Visa",
        isLTF: true,
        annualFee: 0,
        joiningFee: 0,
        rewardRate: "1-2%",
        category: "Cashback",
        applyUrl: "https://www.axisbank.com/retail/cards/credit-card/neo-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "Cashback on utility bills and online shopping",
                details: [
                    "2% cashback on utility bill payments (up to ₹200/month)",
                    "Discounts on Blinkit, Myntra, and partner platforms",
                    "1% on other transactions"
                ]
            },
            lounges: {
                airport: { domestic: 2, international: 0, perQuarter: true, description: "2 domestic lounge visits per quarter (spend-based)" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining discounts at Zomato" },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Good starter card", "Flipkart & Myntra discounts"]
        },
        eligibility: { minIncome: 300000, minAge: 21 },
        highlights: ["Good for utility bills", "Starter LTF card", "Platform discounts"]
    },
    {
        id: "hsbc-cashback",
        name: "HSBC Cashback Credit Card",
        bank: "HSBC",
        network: "Visa",
        isLTF: true,
        annualFee: 0,
        joiningFee: 0,
        rewardRate: "1.5%",
        category: "Cashback",
        applyUrl: "https://www.hsbc.co.in/credit-cards/products/cashback/",
        image: null,
        benefits: {
            cashback: {
                description: "1.5% unlimited cashback on all online spends",
                details: [
                    "1.5% cashback on all online transactions",
                    "No cap on cashback",
                    "Auto-credited to statement"
                ]
            },
            lounges: {
                airport: { domestic: 8, international: 2, perYear: true, description: "8 domestic + 2 international lounge visits per year" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: false },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Unlimited cashback", "Good lounge access for LTF card"]
        },
        eligibility: { minIncome: 600000, minAge: 21 },
        highlights: ["Unlimited 1.5% cashback", "8 domestic lounge visits", "True LTF"]
    },
    {
        id: "indusind-tiger",
        name: "IndusInd Bank Tiger Credit Card",
        bank: "IndusInd Bank",
        network: "Visa",
        isLTF: true,
        annualFee: 0,
        joiningFee: 0,
        rewardRate: "1-1.5%",
        category: "Lifestyle",
        applyUrl: "https://www.indusind.com/in/en/personal/cards/credit-card/tiger-credit-card.html",
        image: null,
        benefits: {
            cashback: {
                description: "Reward points on weekday and weekend spending",
                details: [
                    "1.5 reward points per ₹100 on weekdays",
                    "2 reward points per ₹100 on weekends",
                    "Points redeemable for merchandise and vouchers"
                ]
            },
            lounges: {
                airport: { domestic: 2, international: 0, perQuarter: true, description: "2 domestic lounge visits per quarter" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: true, description: "Complimentary golf rounds at select courses" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: true, description: "Dining offers at partner restaurants" },
            movies: { available: true, description: "Movie ticket discounts" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Weekend bonus rewards", "Lifestyle benefits package"]
        },
        eligibility: { minIncome: 400000, minAge: 21 },
        highlights: ["Golf benefits on LTF", "Weekend bonus rewards", "Good lifestyle perks"]
    },
    {
        id: "rbl-shoprite",
        name: "RBL Shoprite Credit Card",
        bank: "RBL Bank",
        network: "Mastercard",
        isLTF: true,
        annualFee: 0,
        joiningFee: 0,
        rewardRate: "1-5%",
        category: "Shopping",
        applyUrl: "https://www.rblbank.com/credit-cards/shoprite-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "5X rewards on online shopping, 1 point per ₹100 on other",
                details: [
                    "5X reward points on online shopping",
                    "1 reward point per ₹100 on other spends",
                    "Welcome bonus of 2000 points"
                ]
            },
            lounges: {
                airport: { domestic: 0, international: 0, description: "No lounge access" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Good for online shopping", "Welcome bonus"]
        },
        eligibility: { minIncome: 200000, minAge: 21 },
        highlights: ["5X online shopping rewards", "Easy approval", "True LTF"]
    },

    // ===== NON-LTF (PREMIUM) CARDS =====
    {
        id: "hdfc-infinia",
        name: "HDFC Bank Infinia Credit Card",
        bank: "HDFC Bank",
        network: "Visa",
        isLTF: false,
        annualFee: 12500,
        joiningFee: 12500,
        rewardRate: "3.3%",
        category: "Super Premium",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/infinia-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "5 reward points per ₹150 spend = 3.3% reward rate",
                details: [
                    "5 reward points per ₹150 on all spends",
                    "10X points on SmartBuy portal (up to 33% reward rate)",
                    "Points redeemable for flights, hotels at excellent rates",
                    "1 point = ₹1 on SmartBuy"
                ]
            },
            lounges: {
                airport: { domestic: -1, international: -1, description: "Unlimited domestic + international lounge access via Priority Pass" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: true, description: "Unlimited complimentary golf games and coaching at select courses worldwide" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Premium dining privileges, Mastercard World dining offers" },
            movies: { available: true, description: "Complimentary movie tickets" },
            forex: { markupFee: "2%", description: "2% forex markup (offset by high reward rate)" },
            other: ["Complimentary Priority Pass membership", "Concierge services", "Travel insurance up to ₹3 Crore", "Best-in-class reward rate"]
        },
        eligibility: { minIncome: 3000000, minAge: 21 },
        highlights: ["Best overall card in India", "Unlimited lounge access", "Golf", "3.3% reward rate", "Priority Pass"]
    },
    {
        id: "hdfc-diners-black",
        name: "HDFC Diners Club Black Credit Card",
        bank: "HDFC Bank",
        network: "Diners Club",
        isLTF: false,
        annualFee: 10000,
        joiningFee: 10000,
        rewardRate: "3.3%",
        category: "Super Premium",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/diners-club-black",
        image: null,
        benefits: {
            cashback: {
                description: "5 reward points per ₹150, 10X on SmartBuy",
                details: [
                    "5 reward points per ₹150 on all spends",
                    "10X on HDFC SmartBuy portal",
                    "Reward rate matches Infinia"
                ]
            },
            lounges: {
                airport: { domestic: -1, international: -1, description: "Unlimited domestic + international lounge access" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: true, description: "Complimentary golf games at premium courses" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining privileges and discounts" },
            movies: { available: true, description: "2 complimentary movie tickets per month" },
            forex: { markupFee: "1.99%", description: "~2% forex markup" },
            other: ["Annual fee waived on ₹5L+ annual spend", "Concierge", "Travel insurance"]
        },
        eligibility: { minIncome: 1500000, minAge: 21 },
        highlights: ["Infinia-level rewards", "Fee waived at ₹5L spend", "Golf + Unlimited lounge"]
    },
    {
        id: "hdfc-regalia-gold",
        name: "HDFC Regalia Gold Credit Card",
        bank: "HDFC Bank",
        network: "Visa/Mastercard",
        isLTF: false,
        annualFee: 2500,
        joiningFee: 2500,
        rewardRate: "1.3%",
        category: "Premium",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/regalia-gold-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "4 reward points per ₹150 on all spends",
                details: [
                    "4 reward points per ₹150 on all purchases",
                    "Bonus points on HDFC SmartBuy",
                    "Good reward redemption options"
                ]
            },
            lounges: {
                airport: { domestic: 12, international: 6, perYear: true, description: "12 domestic + 6 international lounge visits per year" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: true, description: "Complimentary golf rounds at select courses" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining offers at 1500+ restaurants" },
            movies: { available: true, description: "1 free movie ticket per month" },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["Good mid-range premium card", "Fee waiver on ₹3L annual spend"]
        },
        eligibility: { minIncome: 900000, minAge: 21 },
        highlights: ["Good lounge access", "Golf benefits", "Affordable premium card"]
    },
    {
        id: "icici-emeralde",
        name: "ICICI Emeralde Private Metal Credit Card",
        bank: "ICICI Bank",
        network: "Visa",
        isLTF: false,
        annualFee: 12000,
        joiningFee: 12000,
        rewardRate: "2-3.5%",
        category: "Super Premium",
        applyUrl: "https://www.icicibank.com/card/credit-cards/icici-bank-emeralde-private-metal-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "2-3.5% reward rate depending on spend category",
                details: [
                    "Accelerated rewards across premium categories",
                    "Points redeemable for flights, hotels, and vouchers",
                    "Higher earning rate at partner brands"
                ]
            },
            lounges: {
                airport: { domestic: -1, international: -1, description: "Unlimited domestic + international lounge access" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: true, description: "Unlimited golf lessons or rounds monthly via Golftripz" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: true, description: "Premium dining experiences" },
            movies: { available: true, description: "Complimentary movie tickets" },
            forex: { markupFee: "1.5%", description: "1.5% forex markup" },
            other: ["Metal card", "Concierge 24/7", "Travel insurance", "Premium customer service"]
        },
        eligibility: { minIncome: 4200000, minAge: 21 },
        highlights: ["Metal card", "Unlimited golf via Golftripz", "Unlimited lounge", "Premium concierge"]
    },
    {
        id: "icici-sapphiro",
        name: "ICICI Sapphiro Credit Card",
        bank: "ICICI Bank",
        network: "Visa/Mastercard",
        isLTF: false,
        annualFee: 6500,
        joiningFee: 6500,
        rewardRate: "1-2%",
        category: "Premium",
        applyUrl: "https://www.icicibank.com/card/credit-cards/icici-bank-sapphiro-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "2 reward points per ₹100 on all spends",
                details: [
                    "2 reward points per ₹100 on all purchase",
                    "Bonus points on preferred categories",
                    "Points redeemable for vouchers, flights"
                ]
            },
            lounges: {
                airport: { domestic: 4, international: 2, perQuarter: true, description: "4 domestic + 2 international lounge per quarter" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: true, description: "1 golf round per ₹50,000 spend (up to 4/month) - high ROI if utilized" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: true, description: "Culinary treats dining program" },
            movies: { available: true, description: "Buy 1 Get 1 on movies" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Spend-linked golf is high ROI", "Fee waiver possible on request"]
        },
        eligibility: { minIncome: 1200000, minAge: 21 },
        highlights: ["Best golf ROI", "Spend-linked golf rounds", "Good lounge access"]
    },
    {
        id: "axis-atlas",
        name: "Axis Bank Atlas Credit Card",
        bank: "Axis Bank",
        network: "Visa",
        isLTF: false,
        annualFee: 5000,
        joiningFee: 5000,
        rewardRate: "2-5%",
        category: "Travel",
        applyUrl: "https://www.axisbank.com/retail/cards/credit-card/atlas-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "5 EDGE Miles per ₹200 on travel, 2 on others",
                details: [
                    "5 EDGE Miles per ₹200 on travel (airlines, hotels, cabs)",
                    "2 EDGE Miles per ₹200 on all other spends",
                    "EDGE Miles transferable to airline partners",
                    "High value transfer to Vistara, Air India, etc."
                ]
            },
            lounges: {
                airport: { domestic: 8, international: 8, perYear: true, description: "8 domestic + 8 international lounge visits per year (no spend criteria)" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining privileges" },
            movies: { available: false },
            forex: { markupFee: "2%", description: "2% forex markup" },
            other: ["Best travel rewards card", "No spend criteria for lounge", "Milestone benefits", "Free add-on cards"]
        },
        eligibility: { minIncome: 1500000, minAge: 21 },
        highlights: ["Best travel card", "No spend criteria for lounge", "Transferable miles"]
    },
    {
        id: "amex-platinum",
        name: "American Express Platinum Charge Card",
        bank: "American Express",
        network: "Amex",
        isLTF: false,
        annualFee: 60000,
        joiningFee: 60000,
        rewardRate: "1-5%",
        category: "Ultra Premium",
        applyUrl: "https://www.americanexpress.com/in/credit-cards/platinum-charge-card/",
        image: null,
        benefits: {
            cashback: {
                description: "Membership Rewards Points with premium redemptions",
                details: [
                    "1 MR point per ₹50 spent",
                    "5X points on international spends",
                    "Transfer to 16+ airline & hotel partners",
                    "Welcome bonus of 20,000 MR points"
                ]
            },
            lounges: {
                airport: { domestic: -1, international: -1, description: "Unlimited lounge access via Centurion Lounges + Priority Pass" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: true, description: "Complimentary golf at premium courses worldwide" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: true, description: "Global Dining Collection by Amex" },
            movies: { available: true, description: "Complimentary entertainment privileges" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Centurion Lounge access", "Taj and Marriott benefits", "₹60K annual fee", "Ultimate luxury card"]
        },
        eligibility: { minIncome: 6000000, minAge: 21 },
        highlights: ["Centurion Lounges", "Ultimate luxury experience", "Taj & Marriott benefits"]
    },
    {
        id: "swiggy-hdfc",
        name: "Swiggy HDFC Bank Credit Card",
        bank: "HDFC Bank",
        network: "Mastercard",
        isLTF: false,
        annualFee: 500,
        joiningFee: 500,
        rewardRate: "1-10%",
        category: "Cashback",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/swiggy-hdfc-bank-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "10% on Swiggy, 5% online, 1% offline",
                details: [
                    "10% cashback on Swiggy (up to ₹1500/month)",
                    "5% cashback on other online spends (up to ₹1500/month)",
                    "1% cashback on offline spends (up to ₹500/month)"
                ]
            },
            lounges: {
                airport: { domestic: 2, international: 0, perQuarter: true, description: "2 domestic lounge visits per quarter" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: true, description: "12 free golf lessons per year via Mastercard World" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "10% on Swiggy + dining offers" },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Great for food delivery users", "Low annual fee", "High targeted cashback"]
        },
        eligibility: { minIncome: 400000, minAge: 21 },
        highlights: ["10% Swiggy cashback", "12 golf lessons/year", "Affordable"]
    },
    {
        id: "marriott-bonvoy-hdfc",
        name: "Marriott Bonvoy HDFC Bank Credit Card",
        bank: "HDFC Bank",
        network: "Visa",
        isLTF: false,
        annualFee: 3000,
        joiningFee: 3000,
        rewardRate: "1-8X",
        category: "Hotel/Travel",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/marriott-bonvoy-hdfc-bank-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "8 Marriott Bonvoy points per ₹150 at Marriott, 4 elsewhere",
                details: [
                    "8 Marriott Bonvoy points per ₹150 at Marriott properties",
                    "4 Marriott Bonvoy points per ₹150 on all other spends",
                    "Automatic Marriott Bonvoy Silver Elite status",
                    "Complimentary Marriott stay on annual renewal"
                ]
            },
            lounges: {
                airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic lounge visits per year" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: true, description: "2 golf sessions per quarter through Golf Program" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining benefits at Marriott restaurants" },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Free Marriott night on renewal", "Silver Elite status", "Great for hotel loyalists"]
        },
        eligibility: { minIncome: 600000, minAge: 21 },
        highlights: ["Free Marriott night", "Golf sessions", "Hotel Elite status"]
    },
    {
        id: "hsbc-travel-one",
        name: "HSBC TravelOne Credit Card",
        bank: "HSBC",
        network: "Visa",
        isLTF: false,
        annualFee: 1499,
        joiningFee: 0,
        rewardRate: "2%",
        category: "Travel",
        applyUrl: "https://www.hsbc.co.in/credit-cards/products/travelone/",
        image: null,
        benefits: {
            cashback: {
                description: "2% TravelOne points on all spends, redeemable for flights/hotels",
                details: [
                    "2 points per ₹100 on all spends",
                    "Points redeemable on HSBC Travel portal",
                    "No blackout dates for flight/hotel redemption"
                ]
            },
            lounges: {
                airport: { domestic: 6, international: 4, perYear: true, description: "6 domestic + 4 international lounge visits per year (no spend criteria)" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: false },
            movies: { available: false },
            forex: { markupFee: "0%", description: "Zero forex markup" },
            other: ["Zero forex", "No spend criteria for lounge", "First year free"]
        },
        eligibility: { minIncome: 800000, minAge: 21 },
        highlights: ["Zero forex markup", "No-spend lounge access", "Affordable travel card"]
    },
    {
        id: "idbi-euphoria",
        name: "IDBI Euphoria Credit Card",
        bank: "IDBI Bank",
        network: "Visa",
        isLTF: false,
        annualFee: 2999,
        joiningFee: 2999,
        rewardRate: "1-2%",
        category: "Premium",
        applyUrl: "https://www.idbibank.in/credit-card.aspx",
        image: null,
        benefits: {
            cashback: {
                description: "Reward points on all spends with good redemption value",
                details: [
                    "2 reward points per ₹100 on online",
                    "1 reward point per ₹100 on offline",
                    "Milestone rewards on annual spend targets"
                ]
            },
            lounges: {
                airport: { domestic: -1, international: 0, description: "Unlimited domestic airport lounge access" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "Fuel surcharge waiver" },
            dining: { available: true, description: "Dining offers" },
            movies: { available: true, description: "Movie benefits" },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Unlimited domestic lounge", "Good for lounge enthusiasts", "Milestone rewards"]
        },
        eligibility: { minIncome: 500000, minAge: 21 },
        highlights: ["Unlimited domestic lounge", "Affordable for unlimited access"]
    },
    {
        id: "hdfc-tata-neu-infinity",
        name: "HDFC Tata Neu Infinity Credit Card",
        bank: "HDFC Bank",
        network: "RuPay",
        isLTF: false,
        annualFee: 1499,
        joiningFee: 1499,
        rewardRate: "1.5-5%",
        category: "Cashback",
        applyUrl: "https://www.hdfcbank.com/personal/pay/cards/credit-cards/tata-neu-infinity-hdfc-bank-credit-card",
        image: null,
        benefits: {
            cashback: {
                description: "5% NeuCoins on Tata platforms, 1.5% on others",
                details: [
                    "5% NeuCoins on Tata Neu ecosystem (BigBasket, Croma, Tata CLiQ, etc.)",
                    "1.5% NeuCoins on all other spends",
                    "1 NeuCoin = ₹1"
                ]
            },
            lounges: {
                airport: { domestic: 2, international: 0, perQuarter: true, description: "2 domestic lounge visits per quarter" },
                railway: { count: 4, perQuarter: true, description: "4 railway lounge visits per quarter (RuPay benefit)" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: true, description: "Dining discounts at Tata ecosystem restaurants" },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Best for Tata ecosystem users", "Railway lounge via RuPay", "NeuCoins = cash equivalent"]
        },
        eligibility: { minIncome: 400000, minAge: 21 },
        highlights: ["5% on Tata platforms", "Railway lounge access", "NeuCoins = cash"]
    },
    {
        id: "sbi-cashback",
        name: "SBI Cashback Credit Card",
        bank: "SBI Card",
        network: "Visa",
        isLTF: false,
        annualFee: 999,
        joiningFee: 999,
        rewardRate: "1-5%",
        category: "Cashback",
        applyUrl: "https://www.sbicard.com/en/personal/credit-cards/shopping/sbi-card-cashback.page",
        image: null,
        benefits: {
            cashback: {
                description: "5% cashback on online spends, 1% on offline",
                details: [
                    "5% cashback on online spends",
                    "1% cashback on offline transactions",
                    "Cap applies on cashback per cycle"
                ]
            },
            lounges: {
                airport: { domestic: 4, international: 0, perYear: true, description: "4 domestic lounge visits per year" },
                railway: { count: 0, description: "No railway lounge access" }
            },
            golf: { available: false, description: "No golf benefits" },
            fuel: { surchargeWaiver: true, description: "1% fuel surcharge waiver" },
            dining: { available: false },
            movies: { available: false },
            forex: { markupFee: "3.5%", description: "3.5% forex markup" },
            other: ["Fee waiver on ₹2L annual spend"]
        },
        eligibility: { minIncome: 500000, minAge: 21 },
        highlights: ["Online cashback", "Fee waiver possible"]
    }
];

/**
 * Get all credit cards from the knowledge base
 */
function getAllCards() {
    return JSON.parse(JSON.stringify(CREDIT_CARDS));
}

/**
 * Get cards filtered by LTF status
 */
function getCardsByLTFStatus(isLTF) {
    return CREDIT_CARDS.filter(c => c.isLTF === isLTF).map(c => JSON.parse(JSON.stringify(c)));
}

/**
 * Get all unique bank names
 */
function getUniqueBanks() {
    const banks = [...new Set(CREDIT_CARDS.map(c => c.bank))];
    return banks.sort();
}

/**
 * Get cards that have a specific benefit
 */
function getCardsWithBenefit(benefitType) {
    return CREDIT_CARDS.filter(card => {
        switch (benefitType) {
            case 'lounge':
            case 'airport':
                return card.benefits.lounges.airport.domestic !== 0 || card.benefits.lounges.airport.international !== 0;
            case 'railway':
                return card.benefits.lounges.railway.count !== 0;
            case 'golf':
                return card.benefits.golf.available;
            case 'cashback':
                return card.category === 'Cashback' || card.benefits.cashback.description.toLowerCase().includes('cashback');
            case 'forex':
                return card.benefits.forex.markupFee === '0%';
            case 'dining':
                return card.benefits.dining && card.benefits.dining.available;
            case 'movies':
                return card.benefits.movies && card.benefits.movies.available;
            default:
                return true;
        }
    }).map(c => JSON.parse(JSON.stringify(c)));
}

/**
 * Find a card by ID or name
 */
function findCard(query) {
    const q = query.toLowerCase();
    return CREDIT_CARDS.find(c =>
        c.id === q ||
        c.name.toLowerCase().includes(q) ||
        c.bank.toLowerCase().includes(q)
    );
}

module.exports = { getAllCards, getCardsByLTFStatus, getCardsWithBenefit, getUniqueBanks, findCard, CREDIT_CARDS };
