var conditions = {};

/**
 * First pick which conditions apply to this customer/product combination
 * Collect all the valid discountconditions in the conditions array. 
 */

//function productdetailFetchLocalDiscount() {
//    conditions.splice(0, conditions.length);
//    //loop through discounts
//    for (var x = 0; x < g_discounts.length  ; x++) {
//        //Now loop through field conditions
//        for (var y = 0; y < g_discountConditions.length; y++) {
//            if (g_discounts[x].DiscountID === g_discountConditions[y].DiscountID) {
//            //now get the data to compare between discountvalues and either account or product tables
//                var condition = new Object();
//                condition.Discount = g_discounts[x];
//                condition.DiscountField = g_discountConditions[y].DiscountField;
//                //either compare against account table or product table 
//                if (g_discountConditions[y].RTObject === '#Account') {
//                    condition.Value = g_currentCompany()[g_discountConditions[y].RTAttribute];
//                } else if (g_discountConditions[y].RTObject === '#Product') {
//                    condition.Value = g_pricelistSelectedProduct[g_discountConditions[y].RTAttribute];
//                }
//                conditions.push(condition);
//            }
//        }
//    }
//
//    // Now read ALL discountvalues records to see if any of the conditions apply.
//    var dao = new Dao();
//    dao.cursor('DiscountValues', undefined, undefined, onsuccessDiscountValuesRead, undefined, undefined);
//}


function productdetailFetchLocalDiscount() {
    conditions = {};
    //loop through discounts
    for (var x = 0; x < g_discounts.length  ; x++) {
        //Now loop through field conditions
        for (var y = 0; y < g_discountConditions.length; y++) {
            if (g_discounts[x].DiscountID === g_discountConditions[y].DiscountID) {
            //now get the data to compare between discountvalues and either account or product tables
                var condition = new Object();
                condition.Discount = g_discounts[x];
                condition.DiscountField = g_discountConditions[y].DiscountField;
                condition.InCond = g_discountConditions[y].InCond;
                //either compare against account table or product table 
                if (g_discountConditions[y].RTObject === '#Account') {
                    condition.Value = g_currentCompany()[g_discountConditions[y].RTAttribute];
                } else if (g_discountConditions[y].RTObject === '#Product') {
                    condition.Value = g_pricelistSelectedProduct[g_discountConditions[y].RTAttribute];
                }
                if (conditions[g_discounts[x].DiscountID] == undefined) {
                    conditions[g_discounts[x].DiscountID] = [];
                    
                }
                conditions[g_discounts[x].DiscountID].push(condition);
                //conditions.push(condition);
            }
        }
    }

    // Now read ALL discountvalues records to see if any of the conditions apply.
    var dao = new Dao();
    dao.cursor1('DiscountValues', undefined, undefined, onsuccessDiscountValuesRead);
}


/*
 * Receive all discountvalues records at a time and check if any passes conditions 
 */

function onsuccessDiscountValuesRead(allRows) {
    
    if (!allRows || allRows.length == 0){
        if ($('#quantity').hasClass('ui-disabled')) {
            $('#quantity').removeClass('ui-disabled');
        }
        return;
    }
    var possibleValues = [];
    for (var dv = 0; dv < allRows.length; ++dv) {
        var row = allRows[dv]
        var dvConditions = [];
        
        // get conditions for this row if exists
        if (conditions.hasOwnProperty(row.DiscountID))
            dvConditions = conditions[row.DiscountID];
        else
            continue;
        
        var thisIsOurValue = true;
        //Loop through each condition and see if it applies to this discountvalues row
        for (var i = 0; i < dvConditions.length; i++) {

            if (row.DiscountID !== dvConditions[i].Discount.DiscountID) {
                continue; //not our discountID so continue to next condition
            }
            if (dvConditions[i].InCond) {
                var arrayToCheck = dvConditions[i].Value.split(',');
                var isInArray = false;
                for (var c = 0; c < arrayToCheck.length; ++c) {
                    if (arrayToCheck[c].replace(/'/g, '') == row[dvConditions[i].DiscountField]) {
                        isInArray = true;
                    }                    
                }
                thisIsOurValue = thisIsOurValue && isInArray;
            } else {
                thisIsOurValue = thisIsOurValue && dvConditions[i].Value == row[dvConditions[i].DiscountField];
                
            }
            //yes, we want to use this condition
            
        }
        
        if (!thisIsOurValue)
            continue; //It is our discount, but values dont match, so continue the loop so we move onto the next discountvalues record
        
        row.SortOrder = dvConditions[0].Discount.SortOrder;
        row.SkipRest = dvConditions[0].Discount.SkipRest;
        row.DiscObj = dvConditions[0].Discount;
        possibleValues.push(row);
        
        // we will apply discouts later
        // after we find all matching values
        continue;
        
        //If we here then this row's discount or price must be applied
        if (dvConditions[0].Discount && dvConditions[0].Discount.Type === 'PRICE') {
            g_pricelistSelectedProduct.Nett = row.Price;
            g_pricelistSelectedProduct.Discount = 0;
            if (dvConditions[0].Discount.ApplyToGross) {
                g_pricelistSelectedProduct.Gross = row.Price;
            }
            if (g_pricelistSelectedProduct.Nett > g_pricelistSelectedProduct.Gross){
                g_pricelistSelectedProduct.Gross = g_pricelistSelectedProduct.Nett;
            }
                
        } else if (dvConditions[0].Discount && dvConditions[0].Discount.Type === 'DISCOUNT') {
            g_pricelistSelectedProduct.Discount = row.Discount;
            g_pricelistSelectedProduct.Nett = g_pricelistSelectedProduct.Gross - (g_pricelistSelectedProduct.Gross * (g_pricelistSelectedProduct.Discount / 100));
        }
        
        productdetailValue('discount', g_addCommas(g_pricelistSelectedProduct.Discount.toFixed(2)) + '%');
        productdetailValue('nett', g_addCommas(g_pricelistSelectedProduct.Nett.toFixed(2)));
        $('#grossvalue')['html'](g_addCommas(g_pricelistSelectedProduct.Gross.toFixed(2)));
        
        if (dvConditions[0].Discount.SkipRest)
            break;
    }
    
    console.log(possibleValues);
    discountApplyDiscountValues(possibleValues);
    
}

function discountApplyDiscountValues(discountValues) {
    
    if (discountValues == undefined) {
       if ($('#quantity').hasClass('ui-disabled')) {
            $('#quantity').removeClass('ui-disabled');
        }    
        return;
    }
    var dvComparator = function (a, b) {
        if (a.SortOrder < b.SortOrder)
            return -1;
        if (a.SortOrder > b.SortOrder)
            return 1;
        
        return 0;
    };
    
    discountValues.sort(dvComparator);
    
    for (var i = 0; i < discountValues.length; ++i) {
        //If we here then this row's discount or price must be applied
        if (discountValues[i].DiscObj && discountValues[i].DiscObj.Type === 'PRICE') {
            g_pricelistSelectedProduct.Nett = discountValues[i].Price;
            g_pricelistSelectedProduct.Discount = 0;
            if (discountValues[i].DiscObj.ApplyToGross) {
                g_pricelistSelectedProduct.Gross = discountValues[i].Price;
            }
            if (g_pricelistSelectedProduct.Nett > g_pricelistSelectedProduct.Gross){
                g_pricelistSelectedProduct.Gross = g_pricelistSelectedProduct.Nett;
            }
        } else if (discountValues[i].DiscObj && discountValues[i].DiscObj.Type === 'DISCOUNT') {
            g_pricelistSelectedProduct.Discount = discountValues[i].Discount;
            g_pricelistSelectedProduct.Nett = g_pricelistSelectedProduct.Gross - (g_pricelistSelectedProduct.Gross * (g_pricelistSelectedProduct.Discount / 100));
        }
        
        if (!g_pricelistSelectedProduct.RepChangedPrice) {
            productdetailValue('discount', g_addCommas(g_pricelistSelectedProduct.Discount.toFixed(2)) + '%');
            productdetailValue('nett', g_addCommas(g_pricelistSelectedProduct.Nett.toFixed(2)));
            $('#grossvalue')['html'](g_addCommas(g_pricelistSelectedProduct.Gross.toFixed(2)));
        }
        
        if (discountValues[i].SkipRest)
            break;
    }
    if ($('#quantity').hasClass('ui-disabled')) {
            $('#quantity').removeClass('ui-disabled');
        }
}

//function onsuccessDiscountValuesRead(row) {
//    var condition = new Object();
//    
//    //Loop through each condition and see if it applies to this discountvalues row
//    for (var i = 0; i < conditions.length; i++) {
//        
//        //*** Uncomment for debugging purposes
//        //if (row.DiscountID === 'GGD' && row.AccountGroup === '54' && row.Category === 'CAD-CAN'){
//        //    console.log('debug');
//        //}
//        
//        if (row.DiscountID !== conditions[i].Discount.DiscountID) {
//            continue; //not our discountID so continue to next condition
//        }
//        if (g_discountConditions[i].InCond) {
//            var arrayToCheck = conditions[i].Value.split(',');
//            var isInArray = false;
//            for (var c = 0; c < arrayToCheck.length; ++c) {
//                if (arrayToCheck[c].replace(/'/g, '') == row[conditions[i].DiscountField]) {
//                    isInArray = true;
//                }
//                if (!isInArray) {
//                    return false;
//                }
//            }
//        } else {
//            if (conditions[i].Value !== row[conditions[i].DiscountField]) {
//                return false; //It is our discount, but values dont match, so exit the function so we move onto the next discountvalues record
//            }
//        }
//        //yes, we want to use this condition
//        condition = conditions[i];
//    }
//    //If we here then this row's discount or price must be applied
//    if (condition.Discount && condition.Discount.Type === 'PRICE') {
//        g_pricelistSelectedProduct.Nett = row.Price;
//        g_pricelistSelectedProduct.Discount = 0;
//        if (condition.Discount.ApplyToGross) {
//            g_pricelistSelectedProduct.Gross = row.Price;
//        }
//    } else if (condition.Discount && condition.Discount.Type === 'DISCOUNT') {
//        g_pricelistSelectedProduct.Discount = row.Discount;
//        g_pricelistSelectedProduct.Nett = g_pricelistSelectedProduct.Gross - (g_pricelistSelectedProduct.Gross * (g_pricelistSelectedProduct.Discount / 100));
//    }
//
//    productdetailValue('discount', g_addCommas(g_pricelistSelectedProduct.Discount.toFixed(2)) + '%');
//    productdetailValue('nett', g_addCommas(g_pricelistSelectedProduct.Nett.toFixed(2)));
//    $('#grossvalue')['html'](g_addCommas(g_pricelistSelectedProduct.Gross.toFixed(2)));
//}