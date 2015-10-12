var Discounts = (function() {
    
    // Public
    
    /*
     * Discounts.GetPrice(item, oncomplete);
     */
    
    return {
        
        GetPrice: function(item, oncomplete, onerror) {
            if (g_indexedDB) {
                    GetIndexDBPrice(item, oncomplete, onerror);
            } else {
                    GetSQLDBPrice(item, oncomplete, onerror);
            }            
        }
    };
    
    // Private
    
    var trustedGross;
    var trustedNett;
    var trustedDiscount;
    var trustedItem;
    var oncomplete;
    var onerror;
    
    function GetSQLDBPrice(item, poncomplete, ponerror) {
        oncomplete = poncomplete;
        onerror = ponerror;       
        
        var sql = getSQL(item);
        var dao = new Dao();
        dao.execSQL(sql, function(items){
            var pricelistPriceSQL = "SELECT * FROM Pricelists WHERE index1='" + g_currentCompany().Pricelist + "' and index3='" + item.ProductID.trim() + "' ";
            var dao1 = new Dao();
            dao1.execSQL(pricelistPriceSQL, function(trItem) {
                trustedGross = trItem[0].g;
                trustedNett = trItem[0].n;
                trustedDiscount = trItem[0].d;
                trustedItem = trItem[0];
                var stockPrice = {};
                stockPrice.volumePrice = GetDiscount3(g_discountsDictionary, items, undefined, undefined, item.ProductID.trim(), trustedGross, trustedNett, trustedDiscount);
               
               
               
                //*** Only if we applying more that one discount do we do this.
                if (stockPrice.volumePrice.length > 1) {
                    for (var vp in stockPrice.volumePrice) {
                        //*** when applying multiple discounts to a product, the gross gets decreased. The issue then is that the wrong price is sent to .mobi
                        //*** So once the logic is done, we will do two things.
                        //** 1. We set the gross back to the original gross
                        vp.Gross = trustedItem.g;
                        //*** 2. the discount will now reflect only the last discount.
                        //***    so we will now recalc the disocunt between the original gross and the new nett and then give us the discount between them

                        if (vp.Nett1 > 0) {
                            vp.Discount1 = (trustedItem.g - vp.Nett1) / trustedItem.g * 100;
                        } else {
                            vp.Discount1 = 0;
                        }

                        if (vp.Nett2 > 0) {
                            vp.Discount2 = (trustedItem.g - vp.Nett2) / trustedItem.g * 100;
                        } else {
                            vp.Discount2 = 0;
                        }

                        if (vp.Nett3 > 0) {
                            vp.Discount3 = (trustedItem.g - vp.Nett3) / trustedItem.g * 100;
                        } else {
                            vp.Discount3 = 0;
                        }

                        if (vp.Nett4 > 0) {
                            vp.Discount4 = (trustedItem.g - vp.Nett4) / trustedItem.g * 100;
                        } else {
                            vp.Discount4 = 0;
                        }

                    }
                }
                
                if (oncomplete)
                    oncomplete(stockPrice);
                
            },function(error) {
                onerror(error);
            });
        }, function(items){
            onerror(items);
        });
    }
    
    function GetDiscount3(hashDiscounts, lstDiscValues, supplierID, accountid, productid, trGross, trNett, trDiscount) {
        var bfound = false;
        var liveinfo = {};
        var prevDiscountid = "";
        var cntVolDisc = 0;
        var x = 0;
        var lst = [];
        var trustedValues = {};
        trustedValues.Gross = trGross;
        trustedValues.Nett = trNett;
        trustedValues.Discount = trDiscount;


        //*** loop through all the kinds of discounts
        for (var i = 0; i < g_discounts.length; ++i) {
            var disc = g_discounts[i];
            //*** loop through each discountvalues for the discount
            cntVolDisc = 1;   //This is counter for volume discounts
            x = 0;
            for (var j = 0; j < lstDiscValues.length; ++j) {
                var discountValue = lstDiscValues[j];
                if (disc.DiscountID === discountValue.DiscountID) {
                    //*** pick up all records to be applied
                    if (cntVolDisc === 1) {
                        liveinfo = getNewVolumePrice();
                        liveinfo.ID = disc.DiscountID;
                        liveinfo.skipRest = disc.SkipRest;
                        liveinfo.SortOrder = disc.SortOrder;
                        liveinfo.Gross = trustedValues.Gross;
                        liveinfo.ProductID = productid;
                        liveinfo.ApplyToGross = disc.ApplyToGross;
                        liveinfo.OverwriteDiscount = disc.OverwriteDiscount;
                        liveinfo.Type = disc.Type;
                        bfound = CalcPriceOrDiscount(disc, discountValue, trustedValues, 1, liveinfo, bfound, discountValue.QtyHigh, liveinfo.Deal);
                        liveinfo.Gross = trustedValues.Gross; //** in case applytogross was ticked
                        liveinfo.Deal = discountValue.Deal;
                        lst.push(liveinfo);
                    }
                    //*** now pick up any further quantity discounts
                    if (cntVolDisc === 2) bfound = CalcPriceOrDiscount(disc, discountValue, trustedValues, 2, liveinfo, bfound, discountValue.QtyHigh, liveinfo.Deal);
                    if (cntVolDisc === 3) bfound = CalcPriceOrDiscount(disc, discountValue, trustedValues, 3, liveinfo, bfound, discountValue.QtyHigh, liveinfo.Deal);
                    if (cntVolDisc === 4) bfound = CalcPriceOrDiscount(disc, discountValue, trustedValues, 4, liveinfo, bfound, discountValue.QtyHigh, liveinfo.Deal);

                    if (disc.SkipRest && !HasOtherVolDiscounts(lstDiscValues, x)) {
                        console.log("Skip rest");
                        break;
                    }
                    cntVolDisc = cntVolDisc + 1;
                }
                x = x + 1;
            }
            if (bfound && disc.SkipRest) 
                break;
        }
        if (bfound) { 
//            console.log("Discount/Price calulated as " & liveinfo.toString());
            return lst;
        } else {
            liveinfo = getNewVolumePrice();
            liveinfo.Gross = trustedGross;
            liveinfo.Nett1 = trustedNett;
            liveinfo.ProductID = productid;
            liveinfo.Discount1 = trustedDiscount;
            liveinfo.ApplyToGross = false;
            liveinfo.OverwriteDiscount = false;
            liveinfo.Type = "PRICE";
            liveinfo.Qty1 = 9999;
            lst.push(liveinfo);
            return lst;
        }
    }
    
    //function CalcPriceOrDiscount(disc, discountValue, tr_gross, tr_nett, nett, Discount, bfound, QtyHigh, Qty, Deal) {
    function CalcPriceOrDiscount(disc, discountValue, trValues, index, liveinfo, bfound, QtyHigh, Deal) {
        liveinfo['Qty' + index] = QtyHigh;
        Deal = discountValue.Deal;
        if (disc.Type === 'PRICE') {
            if (disc.OverwriteDiscount) {
                liveinfo['Nett' + index] = discountValue.Price;
            } else {
                liveinfo['Nett' + index] = trValues.Gross - discountValue.Price;
            }
            bfound = true;
        } else if (disc.Type === 'DISCOUNT') {
            if (disc.OverwriteDiscount) {
                liveinfo['Nett' + index] = trValues.Gross - (trValues.Gross * (discountValue.Discount / 100));
            } else {
                liveinfo['Nett' + index] = trValues.Nett - (trValues.Nett * (discountValue.Discount / 100));
            }

            liveinfo['Discount' + index] = discountValue.Discount;
            bfound = true;
        }
        if (bfound) {
            if (disc.ApplyToGross) {
                trValues.Gross = liveinfo['Nett' + index];
                liveinfo['Discount' + index] = 0;
            }
        }
        
        return bfound;
    }
    
    function getSQL(item) {
        
        var sql = '';
        var union = '';
        
        for (var j=0; j < g_discounts.length; ++j) {
            var discountInfo = g_discounts[j]
        
            sql = sql + union + "SELECT dv.* FROM DiscountValues dv WHERE dv.index1='" + discountInfo.DiscountID + "'";
            for (var x = 0; x < g_discountConditions.length; ++x) {
                var discountConditionInfo = g_discountConditions[x];
                if (discountInfo.DiscountID !== discountConditionInfo.DiscountID) 
                    continue;

                if (x < (g_discountConditions.length - 1)) {
                    if (g_discountConditions[x + 1].OrCond) {
                        sql += " AND ( ";    //*** next condition is an or, so add a braket
                    } else if (g_discountConditions[x].OrCond) {
                        sql += " OR ";       //*** this condition is an or
                    } else {
                        sql += " AND ";      //*** all others are and   
                    }
                } else {
                    sql += " AND ";
                }
                
                if (discountConditionInfo.InCond) {
                    var findInArray = discountConditionInfo.RTObject === "#Account" ? 
                        g_currentCompany()[discountConditionInfo.RTAttribute].replace(/'/g,'').split(',') : item[discountConditionInfo.RTAttribute].replace(/'/g,'').split(',');
                    sql += ' ( ';
                    var orStr = '';
                    for (var i=0; i < findInArray.length; ++i) {
                        sql += orStr + " dv.[json] like '%\"" + discountConditionInfo.DiscountField + "\":\"" + findInArray[i] + "\"%' ";
                        orStr = " OR "
                    }
                    sql += " )";
                } else {
                    var rtAttribute = discountConditionInfo.RTObject === "#Account" ? g_currentCompany()[discountConditionInfo.RTAttribute] : item[discountConditionInfo.RTAttribute];
                    sql += " dv.[json] like '%\"" + discountConditionInfo.DiscountField + "\":\"" + rtAttribute + "\"%' ";
                }                
                
                if (g_discountConditions[x].OrCond) {
                    sql += " ) ";   //*** close the bracket if this was the or
                }
            }
            //*** sql &= " and " & quantity & " >= qtylow and " & quantity & " <= qtyhigh " 'commented out as we want all rows returned to calculate volume discounts
            var mom = moment();
            var today = mom.format('YYYY-MM-DD');
            sql += " AND  dv.index3 <= '" + today + "' AND dv.index4 >= '" + today + "' ";
            union = " UNION ";
        }
//        console.log(sql);
        return sql;
    }
    
    function HasOtherVolDiscounts(lstDiscValues, x) {
        if (x === lstDiscValues.length - 1) return false;
        var thisDiscountID, nextDiscountID;
        thisDiscountID = lstDiscValues[x].DiscountID;
        nextDiscountID = lstDiscValues[x + 1].DiscountID;
        if (thisDiscountID === nextDiscountID) {
            return true;
        } else {
            return false;
        }
    }
    
    function getNewVolumePrice() {
        var volumePrice = {};
        volumePrice.ApplyToGross = false;
        volumePrice.Deal = undefined;
        volumePrice.Discount1 = 0;
        volumePrice.Discount2 = 0;
        volumePrice.Discount3 = 0;
        volumePrice.Discount4 = 0;
        volumePrice.Gross = 0;
        volumePrice.ID = undefined;
        volumePrice.Nett1 = 0;
        volumePrice.Nett2 = 0;
        volumePrice.Nett3 = 0;
        volumePrice.Nett4 = 0;
        volumePrice.OverwriteDiscount = false;
        volumePrice.ProductID = undefined;
        volumePrice.Qty1 = 0;
        volumePrice.Qty2 = 0;
        volumePrice.Qty3 = 0;
        volumePrice.Qty4 = 0;
        volumePrice.skipRest = true;
        volumePrice.SortOrder = 0;
        volumePrice.Type = 0;
        
        return volumePrice;
        
    }
    
    function GetIndexDBPrice(item, oncomplete, onerror) {
        productdetailFetchLocalDiscount();
    }
    
    
})();