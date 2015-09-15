var conditions = {};

/**
 * First pick which conditions apply to this customer/product combination
 * Collect all the valid discountconditions in the conditions array. 
 */



function productdetailFetchLocalDiscount() {
    g_busy(true);
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
    var cntVolDisc = 1;
    for (var dv = 0; dv < allRows.length; ++dv) {
        
        // check if dates are valid
        var today = new Date();
        var fromDateSrv = (allRows[dv].FromDate ? allRows[dv].FromDate.replace('/Date(','').replace(')/','').split('+') : new Array(0,1));
        var mom = new moment(parseInt(fromDateSrv[0], 10)); //new moment(activity.DueDate);
        var fromDate = mom.toDate();
        var toDateSrv = (allRows[dv].ToDate ? allRows[dv].ToDate.replace('/Date(','').replace(')/','').split('+') : new Array(0,1));
        mom = new moment(parseInt(toDateSrv[0], 10)); //new moment(activity.DueDate);
        var toDate = mom.toDate();
        
        if (fromDate > today || toDate < today)
            continue; // skip this discount value
        
        var row = allRows[dv];
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
                    if (arrayToCheck[c].replace(/'/g, '') === row[dvConditions[i].DiscountField]) {
                        isInArray = true;
                    }                    
                }
                thisIsOurValue = thisIsOurValue && isInArray;
            } else {
                thisIsOurValue = thisIsOurValue && dvConditions[i].Value === row[dvConditions[i].DiscountField];
                
            }
            //yes, we want to use this condition
            
        }
        
        if (!thisIsOurValue) {
            cntVolDisc = 1;
            continue; //It is our discount, but values dont match, so continue the loop so we move onto the next discountvalues record            
        }
        
        row.SortOrder = dvConditions[0].Discount.SortOrder;
        row.SkipRest = dvConditions[0].Discount.SkipRest;
        row.DiscObj = dvConditions[0].Discount;
        row.cntVolDisc = cntVolDisc;
        possibleValues.push(row);
        ++cntVolDisc;
        // we will apply discouts later
        // after we find all matching values        
    }
    
    console.log(possibleValues);
    discountApplyDiscountValues(possibleValues);
    
}

function discountApplyDiscountValues(discountValues) {
    g_busy(false);
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
        
        if (a.cntVolDisc < b.cntVolDisc)
            return -1;
        if (a.cntVolDisc > b.cntVolDisc)
            return 1;
        
        return 0;
    };
    
    discountValues.sort(dvComparator);
    
    var discIDFlag = '';
    var previousSaidSkipRest = false;
    for (var i = 0; i < discountValues.length; ++i) {

        if (i === 0)
            discIDFlag = discountValues[i].DiscountID;

        if (i > 0 && discIDFlag !== discountValues[i].DiscountID && previousSaidSkipRest) {
            break;
        } else if (i > 0 && discIDFlag === discountValues[i].DiscountID) {
            if (!Number($('#quantity').attr('value'))) {
                discountDiscountValueToVolumePrice(discountValues[i], g_pricelistSelectedProduct);
                continue;
            } else {
                if (g_pricelistVolumePrices[g_pricelistSelectedProduct.ProductID]) {
                    var vp = g_pricelistVolumePrices[g_pricelistSelectedProduct.ProductID];
                    if (Number($('#quantity').attr('value')) < vp['Qty' + (discountValues[i].cntVolDisc - 1)]) {
                        discountDiscountValueToVolumePrice(discountValues[i], g_pricelistSelectedProduct);
                        continue;
                    }
                }
            }
        }
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
        g_pricelistSelectedProduct.UserField15 = discountValues[i].DiscObj.Type;
        
        if (!g_pricelistSelectedProduct.RepChangedPrice || (DaoOptions.getValue('SetRepBoolDiscountUF') && g_pricelistSelectedProduct[DaoOptions.getValue('SetRepBoolDiscountUF')])) {
            productdetailValue('discount', g_addCommas(g_pricelistSelectedProduct.Discount.toFixed(2)) + '%');
            productdetailValue('nett', g_addCommas(g_pricelistSelectedProduct.Nett.toFixed(2)));
            $('#grossvalue')['html'](g_addCommas(g_pricelistSelectedProduct.Gross.toFixed(2)));
        }
        
        discountDiscountValueToVolumePrice(discountValues[i], g_pricelistSelectedProduct);
        previousSaidSkipRest = discountValues[i].SkipRest;
            //break;
    }
    if ($('#quantity').hasClass('ui-disabled')) {
            $('#quantity').removeClass('ui-disabled');
        }
}

function discountRecalcShoppingCart() {
    var dao = new Dao();
    dao.cursor1('DiscountValues', undefined, undefined, onsuccessDiscountValuesRead1);
}

function onsuccessDiscountValuesRead1(allRows) {
    for (var cartItemIndex = 0; cartItemIndex < g_shoppingCartItemKeys.length; ++cartItemIndex) {
        if (g_shoppingCartDetailItems[cartItemIndex].Type === 'PROMOADMIN') 
            continue;
        
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
                        condition.Value = g_shoppingCartDetailItems[cartItemIndex][g_discountConditions[y].RTAttribute];
                    }
                    if (conditions[g_discounts[x].DiscountID] == undefined) {
                        conditions[g_discounts[x].DiscountID] = [];

                    }
                    conditions[g_discounts[x].DiscountID].push(condition);
                    //conditions.push(condition);
                }
            }
        }
        
        var cntVolDisc = 1;
        var possibleValues = [];
        for (var dv = 0; dv < allRows.length; ++dv) {
            
            // check if dates are valid
            var today = new Date();
            var fromDateSrv = (allRows[dv].FromDate ? allRows[dv].FromDate.replace('/Date(','').replace(')/','').split('+') : new Array(0,1));
            var mom = new moment(parseInt(fromDateSrv[0], 10)); //new moment(activity.DueDate);
            var fromDate = mom.toDate();
            var toDateSrv = (allRows[dv].ToDate ? allRows[dv].ToDate.replace('/Date(','').replace(')/','').split('+') : new Array(0,1));
            mom = new moment(parseInt(toDateSrv[0], 10)); //new moment(activity.DueDate);
            var toDate = mom.toDate();

            if (fromDate > today || toDate < today)
                continue; // skip this discount value
            
            var row = allRows[dv];
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
                        if (arrayToCheck[c].replace(/'/g, '') === row[dvConditions[i].DiscountField]) {
                            isInArray = true;
                        }                    
                    }
                    thisIsOurValue = thisIsOurValue && isInArray;
                } else {
                    thisIsOurValue = thisIsOurValue && dvConditions[i].Value === row[dvConditions[i].DiscountField];

                }
                //yes, we want to use this condition

            }

            if (!thisIsOurValue) {
                cntVolDisc = 1;
                continue; //It is our discount, but values dont match, so continue the loop so we move onto the next discountvalues record            
            }
            row.SortOrder = dvConditions[0].Discount.SortOrder;
            row.SkipRest = dvConditions[0].Discount.SkipRest;
            row.DiscObj = dvConditions[0].Discount;
            row.cntVolDisc = cntVolDisc;
            possibleValues.push(row);
            ++cntVolDisc;
            // we will apply discouts later
            // after we find all matching values        
        }

        console.log(possibleValues);
        discountApplyDiscountValues1(possibleValues, cartItemIndex);
        
    }
    
    
}

function discountApplyDiscountValues1(discountValues, index) {
    if (discountValues === undefined || discountValues.length === 0) {
        if (g_shoppingCartItemKeys.length === (index + 1)) {
            g_busy(false);
            if (DaoOptions.getValue('EnableMultiLineDiscount','false') === 'true') {
                shoppingCartRecalcMultilineDiscounts();
            }
        }
        return;
    }
    var dvComparator = function (a, b) {
        if (a.SortOrder < b.SortOrder)
            return -1;
        if (a.SortOrder > b.SortOrder)
            return 1;
        
        if (a.QtyHigh < b.QtyHigh) {
            if (a.cntVolDisc > b.cntVolDisc) {
                var tmp_cntVolDisc = a.cntVolDisc;
                a.cntVolDisc = b.cntVolDisc;
                b.cntVolDisc = tmp_cntVolDisc;
            }
            return -1;
        }
        if (a.QtyHigh > b.QtyHigh) {
            if (a.cntVolDisc < b.cntVolDisc) {
                var tmp_cntVolDisc = a.cntVolDisc;
                a.cntVolDisc = b.cntVolDisc;
                b.cntVolDisc = tmp_cntVolDisc;
            }
            return 1;
        }
        
//        if (a.cntVolDisc < b.cntVolDisc)
//            return -1;
//        if (a.cntVolDisc > b.cntVolDisc)
//            return 1;
        
        return 0;
    };
    
    discountValues.sort(dvComparator);
//    var currentProduct = g_shoppingCartDetailItems[index];
    
    var dao = new Dao();
    dao.get("BasketInfo", g_shoppingCartItemKeys[index], function(basketInfo) {
        var discIDFlag = '';
        var previousSaidSkipRest = false;
        for (var i = 0; i < discountValues.length; ++i) {
            
            if (i === 0)
                discIDFlag = discountValues[i].DiscountID;
            
            if (i > 0 && discIDFlag !== discountValues[i].DiscountID && previousSaidSkipRest) {
                break;
            } else if (i > 0 && discIDFlag === discountValues[i].DiscountID) {
                if (g_pricelistVolumePrices[g_shoppingCartDetailItems[index].ProductID]) {
                    var vp = g_pricelistVolumePrices[g_shoppingCartDetailItems[index].ProductID];
                    if (basketInfo.Quantity < vp['Qty' + (discountValues[i].cntVolDisc - 1)]) {
                        discountDiscountValueToVolumePrice(discountValues[i], basketInfo);
                        continue;
                    }
                }
            }
            
            if (DaoOptions.getValue('EnableMultiLineDiscount','false') === 'true' && 
                    discountValues[i].DiscountID === DaoOptions.getValue('MultiLineDiscountID')) {
                    if (!g_shoppingCartMultilineDiscItems.hasOwnProperty(basketInfo.UserField05)) 
                        g_shoppingCartMultilineDiscItems[basketInfo.UserField05] = [];

                    if (!g_shoppingCartMultilineDiscQty.hasOwnProperty(basketInfo.UserField05)) 
                        g_shoppingCartMultilineDiscQty[basketInfo.UserField05] = 0;

                    g_shoppingCartMultilineDiscItems[basketInfo.UserField05][index] = basketInfo;
                    g_shoppingCartMultilineDiscQty[basketInfo.UserField05] += basketInfo.Quantity;

                    g_shoppingCartMultilineItemPromoID[index] = basketInfo.UserField05;
            }
            
            //If we here then this row's discount or price must be applied
            if (discountValues[i].DiscObj && discountValues[i].DiscObj.Type === 'PRICE') {
                basketInfo.Nett = discountValues[i].Price;
                basketInfo.Discount = 0;
                if (discountValues[i].DiscObj.ApplyToGross) {
                    basketInfo.Gross = discountValues[i].Price;
                }
                if (basketInfo.Nett > basketInfo.Gross){
                    basketInfo.Gross = basketInfo.Nett;
                }
                basketInfo.DiscountApplied = true;
            } else if (discountValues[i].DiscObj && discountValues[i].DiscObj.Type === 'DISCOUNT') {
                basketInfo.Discount = discountValues[i].Discount;
                basketInfo.Nett = basketInfo.Gross - (basketInfo.Gross * (basketInfo.Discount / 100));
                basketInfo.DiscountApplied = true;
            }
            basketInfo.UserField15 = discountValues[i].DiscObj.Type;


    //        if (!g_pricelistSelectedProduct.RepChangedPrice) {
    //            productdetailValue('discount', g_addCommas(g_pricelistSelectedProduct.Discount.toFixed(2)) + '%');
    //            productdetailValue('nett', g_addCommas(g_pricelistSelectedProduct.Nett.toFixed(2)));
    //            $('#grossvalue')['html'](g_addCommas(g_pricelistSelectedProduct.Gross.toFixed(2)));
    //        }
            discountDiscountValueToVolumePrice(discountValues[i], basketInfo);
            previousSaidSkipRest = discountValues[i].SkipRest;
                //break;
        }
        basket.saveItem(basketInfo, basketInfo.Quantity);
        $('#' + index + 'nett').text('' + g_roundToTwoDecimals(shoppingCartItemNett(basketInfo))); //$('#' + itemIndex + 'nett').text('' + basketInfo.Nett);
            $('#' + index + 'total').text(g_roundToTwoDecimals(shoppingCartItemNett(basketInfo) / ((DaoOptions.getValue('DividePriceByUnit')  === 'true') && g_isPackSizeUnitValid(basketInfo.Unit) ? basketInfo.Unit : 1) * basketInfo.Quantity));
            g_shoppingCartTotalExcl = 0;
            $.each($(".total") ,function() {
                var value = $(this).text().replace(',','');
                g_shoppingCartTotalExcl += parseFloat(value);
            });
            shoppingCartRecalcTotals(basketInfo, basketInfo.Quantity);   
            if (g_shoppingCartItemKeys.length === (index + 1)) {
                    g_busy(false);
                    if (DaoOptions.getValue('EnableMultiLineDiscount','false') === 'true') {
                        shoppingCartRecalcMultilineDiscounts();
                    }
                }
        },undefined, undefined);
}

function discountDiscountValueToVolumePrice(dv, item) {
    if (dv.cntVolDisc === 1) {
        var vp = {};
        vp.ApplyToGross = dv.DiscObj.ApplyToGross;
        vp.Deal = dv.Deal;
        vp.Discount1 = dv.Discount;
        vp.Discount2 = 0;
        vp.Discount3 = 0;
        vp.Discount4 = 0;
        try {
            vp.Gross = parseFloat(item.Gross.replace(/,/g,''));
        } catch(ex) {vp.Gross = item.Gross;}
        vp.ID = dv.DiscountID;
        if (dv.DiscObj.Type === 'DISCOUNT')
            vp.Nett1 = item.Gross - (item.Gross * (dv.Discount / 100));
        else 
            vp.Nett1 = dv.Price;
        vp.Nett2 = 0;
        vp.Nett3 = 0;
        vp.Nett4 = 0;
        vp.OverwriteDiscount = dv.DiscObj.OverwriteDiscount;
        vp.ProductID = item.ProductID;
        vp.Qty1 = dv.QtyHigh;
        vp.Qty2 = 0;
        vp.Qty3 = 0;
        vp.Qty4 = 0;
        vp.SortOrder = dv.DiscObj.SortOrder;
        vp.Type = dv.DiscObj.Type;
        vp.skipRest = dv.DiscObj.SkipRest;
        g_pricelistVolumePrices[item.ProductID] = vp;
    }
    
    if (dv.cntVolDisc === 2) {
        var vp = g_pricelistVolumePrices[item.ProductID];
        vp.Discount2 = dv.Discount;
        if (dv.DiscObj.Type === 'DISCOUNT')
            vp.Nett2 = item.Gross - (item.Gross * (dv.Discount / 100));
        else 
            vp.Nett2 = dv.Price;
        vp.Qty2 = dv.QtyHigh;
        
        g_pricelistVolumePrices[item.ProductID] = vp;
    }
    
    if (dv.cntVolDisc === 3) {
        var vp = g_pricelistVolumePrices[item.ProductID];
        vp.Discount3 = dv.Discount;
        if (dv.DiscObj.Type === 'DISCOUNT')
            vp.Nett3 = item.Gross - (item.Gross * (dv.Discount / 100));
        else 
            vp.Nett3 = dv.Price;
        vp.Qty3 = dv.QtyHigh;
        
        g_pricelistVolumePrices[item.ProductID] = vp;
    }
    
    if (dv.cntVolDisc === 4) {
        var vp = g_pricelistVolumePrices[item.ProductID];
        vp.Discount4 = dv.Discount;
        if (dv.DiscObj.Type === 'DISCOUNT')
            vp.Nett4 = item.Gross - (item.Gross * (dv.Discount / 100));
        else 
            vp.Nett4 = dv.Price;
        vp.Qty4 = dv.QtyHigh;
        
        g_pricelistVolumePrices[item.ProductID] = vp;
    }
}