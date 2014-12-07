var conditions = [];

/**
 * First pick which conditions apply to this customer/product combination
 * Collect all the valid discountconditions in the conditions array. 
 */

function productdetailFetchLocalDiscount() {
    conditions.splice(0, conditions.length);
    //loop through discounts
    for (var x = 0; x < g_discounts.length  ; x++) {
        //Now loop through field conditions
        for (var y = 0; y < g_discountConditions.length; y++) {
            if (g_discounts[x].DiscountID === g_discountConditions[y].DiscountID) {
            //now get the data to compare between discountvalues and either account or product tables
                var condition = new Object();
                condition.Discount = g_discounts[x];
                condition.DiscountField = g_discountConditions[y].DiscountField;
                //either compare against account table or product table 
                if (g_discountConditions[y].RTObject === '#Account') {
                    condition.Value = g_currentCompany()[g_discountConditions[y].RTAttribute];
                } else if (g_discountConditions[y].RTObject === '#Product') {
                    condition.Value = g_pricelistSelectedProduct[g_discountConditions[y].RTAttribute];
                }
                conditions.push(condition);
            }
        }
    }

    // Now read ALL discountvalues records to see if any of the conditions apply.
    var dao = new Dao();
    dao.cursor('DiscountValues', undefined, undefined, onsuccessDiscountValuesRead, undefined, undefined);
}


/*
 * Receive one discountvalues record at a time and check if it passes conditions 
 */
function onsuccessDiscountValuesRead(row) {
    var condition = new Object();
    
    //Loop through each condition and see if it applies to this discountvalues row
    for (var i = 0; i < conditions.length; i++) {
        
        //*** Uncomment for debugging purposes
        //if (row.DiscountID === 'GGD' && row.AccountGroup === '54' && row.Category === 'CAD-CAN'){
        //    console.log('debug');
        //}
        
        if (row.DiscountID !== conditions[i].Discount.DiscountID) {
            continue; //not our discountID so continue to next condition
        }
        if (conditions[i].Value !== row[conditions[i].DiscountField]) {
            return false; //It is our discount, but values dont match, so exit the function so we move onto the next discountvalues record
        }
        //yes, we want to use this condition
        condition = conditions[i];
    }
    //If we here then this row's discount or price must be applied
    if (condition.Discount && condition.Discount.Type === 'PRICE') {
        g_pricelistSelectedProduct.Nett = row.Price;
        g_pricelistSelectedProduct.Discount = 0;
    } else if (condition.Discount && condition.Discount.Type === 'DISCOUNT') {
        g_pricelistSelectedProduct.Discount = row.Discount;
        g_pricelistSelectedProduct.Nett = g_pricelistSelectedProduct.Gross - (g_pricelistSelectedProduct.Gross * (g_pricelistSelectedProduct.Discount / 100));
    }

    productdetailValue('discount', g_addCommas(g_pricelistSelectedProduct.Discount.toFixed(2)) + '%');
    productdetailValue('nett', g_addCommas(g_pricelistSelectedProduct.Nett.toFixed(2)));
}