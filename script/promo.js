/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var promo = (function(){

    var instance;

    function instanceObj() {

        this.onComplete = '';
        this.user = '';
        this.account = '';
        this.tpms = [];
        this.currentBasket = [];
        this.mathcingTPMs = [];

        this.checkMandatoryPromos = function (user, account, onComplete) {

            this.onComplete = onComplete; //store complete function for later use
            this.user = user;
            this.account = account;
            this.tpms = [];
            this.currentBasket = [];
            this.mathcingTPMs = [];

            var $this = this;

            var today = new Date();

            var dao= new Dao();
            dao.cursor('Tpm', '', '', function(item) {

                if (moment(item.FromDate).toDate() <= today && today <= moment(item.ToDate).toDate()) {
                    try {
                        item.json = JSON.parse(item.json);
                        $this.tpms.push(item);
                    } catch (ex) {
                        console.log('An error occurred while reading local TPM: ');
                        console.log(item);
                    }
                } else {
                    dao.deleteItem('Tpm', item.key);
                }

            }, onComplete, function() {
                setTimeout(function() {
                    $this.fetchTPM(0, $this);
                }, 5);
            });
        };

       this.fetchTPM = function(tpmcount, $this) {
            if (tpmcount === $this.tpms.length) {
                //we have finished checking all promo's, so run onComplete <-- OLD logic
//                $this.onComplete();
//                return;

                //we have finished checking all promo's, so show them to user
                $this.showPopup($this);
                return;
            }
            $this.tpmcount = tpmcount; //store for later
            var tpm = $this.tpms[tpmcount];
            //see if this customer should get this tpm
            var useTPM = false;
            for (var y=0; y < tpm.json.accountConditions.length; y++) {
                var cond = tpm.json.accountConditions[y];
//                for (z=0; z < tpm.json.values.length; z++){
//                      var val = tpm.json.values[z];
//                      if ($this.account[cond.ObjectProperty] === val[cond.TPMField] && tpm.json.mandatory) useTPM  = true;
//                 }

                    //var val = cond.Values[z];
                    //if (cond.ObjectProperty === 'All' || $.inArray($this.account[cond.ObjectProperty], cond.Values) > -1) useTPM  = true;
                    if ($this.checkAccountCondition(cond, $this)) useTPM = true;

             }

             // TEST
//             useTPM = true;

             //if promo not for this customer, then move on to next promo
             if (!useTPM ){
                 tpmcount += 1;
                 $this.fetchTPM(tpmcount, $this);
                 return;
             }
             //valid promo for this account, so check conditions
             $this.checkCondition(tpm, 0, $this);
        };

        // run through conditions one at a time
        this.checkCondition = function(tpm, condcount, $this) {
            //been through all conditions, so move onto next tpm
            if (condcount === tpm.json.productConditions.length) {
                 $this.tpmcount += 1;
                 $this.fetchTPM($this.tpmcount, $this);
                 return;
            }

            var cond = tpm.json.productConditions[condcount];

            //for (z=0; z < tpm.json.values.length; z++){
            //      var val = tpm.json.values[z];
                  $this.checkbasket(tpm, $this.user, $this.account, cond, cond.Buy, condcount, this);
            //}
        };

        //this function checks if the should be in the basket
        this.checkbasket = function(tpm, user, account, tpmcond, tpmval, condcount, $this) {
            var qty = 0;
            var triggerItems = [];
            var dao = new Dao();
            dao.index('BasketInfo', $.trim(account.AccountID), 'index1',
                                function (json){
                                    // add up quantities as may be checking quantity of all products in a category
                                    //NB. For below to work, you may need to add product.categoryname to shopping cart fields.

                                    // TEST
//                                    if (/*json.Type !== 'PROMO'*/ !json.DiscountApplied && $.inArray(json[tpmcond.ObjectProperty], tpmval) > -1) {
                                    if (!(tpm.json.notAllowedWithDeal && json.DiscountApplied) && $this.checkProductCondition(tpmval, json)) {
                                        $this.currentBasket.push(json);
                                        triggerItems.push(json.ProductID);
                                        qty += json.Quantity;
                                    }
                                } ,
                                undefined,
                                function (){
                                    if (qty >= tpm.json.BuyQty){
                                        //$this.savePromotion(user, account, tpm,  tpmcond, tpmval, qty, condcount, $this);
                                        if (!tpm.matchingConditions) {
                                            tpm.matchingConditions = [];
                                            tpm.matchingQtys = 0;
                                            $this.mathcingTPMs.push(tpm);
                                        }
                                        tpm.json.productConditions[condcount].triggerItems = triggerItems;
                                        tpm.matchingConditions.push(condcount);
                                        tpm.matchingQtys += qty;
                                    } /* else {
                                        //delete the promo from shopping cart if it does exist and move onto next condition.
                                        for (var x = 0; x < tpmcond.Free.length; ++x) {
                                            var key = tpmcond.Free[x].ID + user.SupplierID + user.UserID + account.AccountID;
                                            dao.deleteItem('BasketInfo', key);
                                        }

                                    } */
                                    condcount += 1;
                                    $this.checkCondition(tpm, condcount, $this);
                                }
                             );
        };

        //add or modify promo in the basket
        this.savePromotion = function(user, account, tpm, tpmcond, tpmval, qty, condcount, $this){
             //NB.  Math.floor will remove the remainder, ie 2.9 becomes 2 and should not be rounded up to 3
             //eg. If the promo is buy 24, get 1 free, and they buy 65, then 65/24 = 2.7083 , but should be round down to 2
             var freeqty = Math.floor((qty / tpmval.BuyQty)) * tpmval.FreeQty;

            //now read local database to see if promo exists in cart, if it does, amend, if not, then add
            var key = tpmval.PromoProductID + user.SupplierID + user.UserID + account.AccountID;

            tpmval.Nett = '0.00';
            tpmval.Discount = '0.00';
            tpmval.Gross = '0.00';
            tpmval.Type = 'PROMO';
            tpmval.PromoID = tpm.TPMID;

            var dao = new Dao();
            dao.get('BasketInfo',key,
                function(json){

                    //this Tpm exists in cart, so update qty
                    basket.saveItem(tpmval, freeqty);
                },
                function(err){

                    //this promo does not exist in basket, so add it
                   basket.saveItem(tpmval, freeqty);
                },
                function () {

                    //on complete of get, move onto next condition
                    condcount += 1;
                    $this.checkCondition(tpm, condcount, $this);
                 });
        };

        this.showPopup = function ($this) {
            if ($this.mathcingTPMs.length === 0) {
                $this.onComplete();
            } else {
                var itemsHTMLHeader = '<thead><tr><th>Promotion</th><th>Product</th><th>Description</th><th style="width: 55px;">Free</th><th>Disc &#37;</th></tr></thead>';
                var itemsHTML = '';
                var allFreeItems = [];
                for (var i = 0; i < $this.mathcingTPMs.length; ++i) {
                    var tpm = $this.mathcingTPMs[i];
                    // first we have to sum all free items for this promotion
                    var freeItemsCount = 0;
                    var maxQty = 0;
                    var maxQtyPerItem = 0;
                    if (tpm.json.type === 'free') {
                        for (var j = 0; j < tpm.matchingConditions.length; ++j) {
                            var prodCond = tpm.json.productConditions[tpm.matchingConditions[j]];
                            freeItemsCount += prodCond.Free.length;
                        }
                        maxQty = Math.floor((tpm.matchingQtys / tpm.json.BuyQty)) * tpm.json.FreeQty;
                        maxQtyPerItem = Math.floor((maxQty / freeItemsCount));
                    }

                    itemsHTML += '<tbody data-promotion-index="' + i + '" data-max-qty="' + maxQty +'"  >';
                    for (var j = 0; j < tpm.matchingConditions.length; ++j) {
                        var tpmcond = tpm.json.productConditions[tpm.matchingConditions[j]];
                        if (tpm.json.type === 'discount') {
                            var item = {};
                            item.TPMID = tpm.TPMID;
                            item.ProductID = '';
                            item.Description = tpm.Description;
                            item.PromoDiscount = tpm.json.Discount;
                            item.MaxQty = maxQty;
                            item.PromoType = 'DISCOUNT';
                            item.noOtherDiscounts = tpm.json.noOtherDiscounts;
                            item.notAllowedWithDeal = tpm.json.notAllowedWithDeal;
                            item.ignoreDealWithPromo = tpm.json.ignoreDealWithPromo;
                            item.ignoreContractWhenTakePromo = tpm.json.ignoreContractWhenTakePromo;
                            item.mandatory = tpm.json.mandatory;
                            item.triggerItems = tpmcond.triggerItems;
                            item.priority = (i + 1); //tpm.Priority || tpm.priority || (i + 1);

                            itemsHTML += '<tr ' + ((i !== 0 && (j) === 0 )? ' class="firstPromoRow" ' : '') + ' ><td>' + tpm.TPMID + '</td>';
                            itemsHTML += '<td></td>';
                            itemsHTML += '<td>' + tpm.Description + '</td>';
                            itemsHTML += '<td><input id="promoItem' + allFreeItems.length + 'Qty" class="promoItemInput' + tpm.TPMID + 'Qty" type="number" min="0" max="0" style="width: 85%;" readonly /></td>';
                            itemsHTML += '<td><input id="promoItem' + allFreeItems.length + 'Disc" class="promoItemInput' + tpm.TPMID + 'Disc" type="number" min="0" max="' + tpm.json.Discount + '" + value="' + tpm.json.Discount + '" style="width: 85%;" readonly /></td>';
                            itemsHTML += '<td><a id="promoItemSelectBtn' + allFreeItems.length + '" class="promoItemSelector promoItemSelectBtnAccept promoSelect' + tpm.TPMID + '" data-role="button" data-mini="true" href >Accept</a></td></tr>';

                            allFreeItems.push(item);

                        } else {

                            for (var x = 0; x < tpmcond.Free.length; ++x) {
                                var item = {};
                                item.TPMID = tpm.TPMID;
                                item.ProductID = tpmcond.Free[x].ID;
                                item.Description = tpmcond.Free[x].Label; //tpmcond.Free[x].Description;
                                item.MaxQty = maxQty;
                                item.PromoType = 'FREE';
                                item.noOtherDiscounts = tpm.json.noOtherDiscounts;
                                item.notAllowedWithDeal = tpm.json.notAllowedWithDeal;
                                item.ignoreDealWithPromo = tpm.json.ignoreDealWithPromo;
                                item.ignoreContractWhenTakePromo = tpm.json.ignoreContractWhenTakePromo;
                                item.mandatory = tpm.json.mandatory;
                                item.triggerItems = tpmcond.triggerItems;
                                item.priority = (i + 1); //tpm.Priority || tpm.priority || (i + 1);

                                itemsHTML += '<tr ' + ((i !== 0 && (j+x) === 0 )? ' class="firstPromoRow" ' : '') + ' ><td>' + tpm.TPMID + '</td>';
                                itemsHTML += '<td>' + tpmcond.Free[x].ID + '</td>';
                                itemsHTML += '<td>' + tpmcond.Free[x].Label + '</td>';
                                itemsHTML += '<td><input id="promoItem' + allFreeItems.length + 'Qty" class="promoItemInput' + tpm.TPMID + 'Qty" type="number" min="0" max="' + maxQty + '" + placeholder="' + maxQtyPerItem+ '" style="width: 85%;"/></td>';
                                itemsHTML += '<td><input id="promoItem' + allFreeItems.length + 'Disc" class="promoItemInput' + tpm.TPMID + 'Disc" type="number" min="0" max="0" style="width: 85%;" readonly /></td>';
                                itemsHTML += '<td><a id="promoItemSelectBtn' + allFreeItems.length + '" class="promoItemSelector promoItemSelectBtnAccept promoSelect' + tpm.TPMID + '" data-role="button" data-mini="true" href >Accept</a></td></tr>';

                                allFreeItems.push(item);
                            }
                        }

                    }
                    itemsHTML += '</tbody>';
                }

                $('#localTPMItemsTable').html(itemsHTMLHeader + itemsHTML);
                $('#shoppingCartLocalTPMPopup').popup('open');

                $('#localTPMItemsTable .promoItemSelector').button().off().on('click', function() {
//                    g_alert('clicked on Select button');
                    var itemIndex = parseInt($(this).attr('id').replace('promoItemSelectBtn',''), 10);
                    var tpmBtnValue = $('#promoItemSelectBtn' + itemIndex + ' .ui-btn-text').text() === 'Remove';
                    if (allFreeItems[itemIndex].PromoType === 'FREE' && tpmBtnValue) {
                            $('#promoItem' + itemIndex + 'Qty').val('');
                        }
                    $this.checkOverlapping(itemIndex, $this, allFreeItems);

                    if (tpmBtnValue) {
                        $('#promoItemSelectBtn' + itemIndex).removeClass('promoItemSelectBtnRemove');
                        $('#promoItemSelectBtn' + itemIndex).addClass('promoItemSelectBtnAccept');
                        $('#promoItemSelectBtn' + itemIndex + ' .ui-btn-text').text('Accept');
                        if (allFreeItems[itemIndex].PromoType === 'FREE') {
                            $('#promoItem' + itemIndex + 'Qty').val('');
                        }
                    } else {
                        if ((allFreeItems[itemIndex].PromoType === 'FREE' && $('#promoItem' + itemIndex + 'Qty').val() !== '0' && $('#promoItem' + itemIndex + 'Qty').val() !== '') ||
                                (allFreeItems[itemIndex].PromoType === 'DISCOUNT')) {
                            $('#promoItemSelectBtn' + itemIndex).removeClass('promoItemSelectBtnAccept');
                            $('#promoItemSelectBtn' + itemIndex).addClass('promoItemSelectBtnRemove');
                            $('#promoItemSelectBtn' + itemIndex + ' .ui-btn-text').text('Remove');
                        }
                    }
                });

                $('#localTPMItemsTable tbody input').keydown(function(event) {
                    return g_isValidQuantityCharPressed(event);
                });

                $('#shoppingCartLocalTPMOK').off().on('click', function() {
                    var promoItemQtys = $('#localTPMItemsTable tbody input');
                    var qtySum = 0;
                    var promID = '';
                    var qtyOK = true;
                    var selectedItems = [];
                    var hasMandatories = false;
                    var mandatorySelected = false;
                    for (var i = 0; i < allFreeItems.length; ++i) {
                        var tmpItem = $('#promoItem' + i + 'Qty').parents('tbody').hasClass('ui-disabled');
                        var tmoBtnValue = $('#promoItemSelectBtn' + i + ' .ui-btn-text').text() === 'Remove';
                        //selectedItems.push(!tmpItem);
                        selectedItems.push(tmoBtnValue);
                        if (promID !== allFreeItems[i].TPMID) {
                            promID = allFreeItems[i].TPMID;
                            qtySum = 0;
                        }
                        hasMandatories = hasMandatories || allFreeItems[i].mandatory;
                        if (allFreeItems[i].mandatory) {
                            mandatorySelected = mandatorySelected || selectedItems[i]
                        }
                        qtySum += parseInt($('#promoItem' + i + 'Qty').val() === '' ? 0 : $('#promoItem' + i + 'Qty').val(), 10);

                        if (selectedItems[i] && allFreeItems[i].PromoType === 'FREE')
                            qtyOK = qtySum <= allFreeItems[i].MaxQty;

                        if (!qtyOK) {
                            break;
                        }
                    }
                    if (hasMandatories && !mandatorySelected) {
                        g_alert('You have to accept mandatory promotions.');
                        return;
                    } else if (!qtyOK) {
                        g_alert('Max free quantity has been exceeded');
                        return;
                    } else {
                        var prItems = [];
                        for (var x = 0; x < allFreeItems.length; ++x) {
                            if (!selectedItems[x]) continue;
                            var item = {};
                            item.ProductID = allFreeItems[x].ProductID;
                            item.Description = allFreeItems[x].Description;
                            item.Nett = '0.00';
                            item.Discount = '0.00';
                            item.Gross = '0.00';
                            item.Type = 'PROMO';
                            item.PromoType = allFreeItems[x].PromoType;
                            item.PromoID = allFreeItems[x].TPMID;
                            item[item.PromoType === 'FREE' ? 'Quantity' : 'PromoDiscount'] = parseFloat($('#promoItem' + x + (item.PromoType === 'FREE' ? 'Qty' : 'Disc')).val() === '' ? 0 : $('#promoItem' + x + (item.PromoType === 'FREE' ? 'Qty' : 'Disc')).val());

                            item.noOtherDiscounts = allFreeItems[x].noOtherDiscounts;
                            item.notAllowedWithDeal = allFreeItems[x].notAllowedWithDeal;
                            item.ignoreDealWithPromo = allFreeItems[x].ignoreDealWithPromo;
                            item.ignoreContractWhenTakePromo = allFreeItems[x].ignoreContractWhenTakePromo;
                            item.triggerItems = allFreeItems[x].triggerItems;

                            //if (item.Quantity) {
                                prItems.push(item);
                            //}
                        }

                        if (prItems.length) {
                            $this.saveBasketItems(prItems, $this);
                        } else {
                            $this.onComplete();
                            $('#shoppingCartLocalTPMPopup').popup('close');
                        }

                    }

                });
                $('#shoppingCartLocalTPMCancel').off().on('click', function() {
                    $('#shoppingCartLocalTPMPopup').popup('close');
                });
            }
        };

        this.saveBasketItems = function(selectedPromoItems, $this) {

            var nonPromoItems = [];

            var processItems = function () {
                var nonPromoItemsNeedToBeChanged = [];
                var freePromoItemsToBeAdded = [];
                for (var i = 0; i < nonPromoItems.length; ++i) {
                    var regularItem = nonPromoItems[i];
                    for (var j = 0; j < selectedPromoItems.length; ++j) {
                        var promoItem = selectedPromoItems[j];
                        if ($.inArray(regularItem.ProductID, promoItem.triggerItems) > -1) {
                            if (promoItem.ignoreContractWhenTakePromo) {
                                if (promoItem.PromoType === 'DISCOUNT') {
                                    regularItem.RepDiscount = promoItem.PromoDiscount;
                                    regularItem.RepNett = parseFloat(regularItem.Nett) - (parseFloat(regularItem.Nett) * (regularItem.RepDiscount / 100));
                                    regularItem.RepChangedPrice = true;
                                    regularItem.UserField03 = promoItem.PromoID;
                                    regularItem.PromoID = promoItem.PromoID;
                                    regularItem.PromoType = promoItem.PromoType;
                                    regularItem.Value = regularItem.RepNett * regularItem.Quantity

                                    // nonPromoItemsNeedToBeChanged.push(regularItem);
                                } else if (promoItem.PromoType === 'FREE') {
                                    regularItem.RepNett = regularItem.Gross;
                                    regularItem.RepDiscount = 0;
                                    regularItem.RepChangedPrice = true;
    //                                regularItem.UserField03 = promoItem.PromoID;
    //                                regularItem.PromoType = promoItem.PromoType;
    //                                if (promoItem.ProductID === regularItem.ProductID) {
    //                                    regularItem.FreeQty = promoItem.Quantity;
    //                                    regularItem.Quantity += regularItem.FreeQty;
    //                                }
                                    if (promoItem.Quantity /*&& promoItem.ProductID !== regularItem.ProductID*/) {
                                        freePromoItemsToBeAdded.push(promoItem);
                                    }
                                }
                                nonPromoItemsNeedToBeChanged.push(regularItem);
                            } else {
                                if (promoItem.PromoType === 'DISCOUNT') {
                                    regularItem.RepDiscount = promoItem.PromoDiscount;
                                    regularItem.RepNett = parseFloat(regularItem.Gross) - (parseFloat(regularItem.Gross) * (regularItem.RepDiscount / 100));
                                    regularItem.RepChangedPrice = true;
                                    regularItem.UserField03 = promoItem.PromoID;
                                    regularItem.PromoID = promoItem.PromoID;
                                    regularItem.PromoType = promoItem.PromoType;
                                } else if (promoItem.PromoType === 'FREE') {
                                    if (promoItem.Quantity ) {
                                        freePromoItemsToBeAdded.push(promoItem);
                                    }
                                }

                                nonPromoItemsNeedToBeChanged.push(regularItem);
                            }


                            // nonPromoItemsNeedToBeChanged.push(regularItem);
                            //break;
                        }
                    }
                }

                var insertItemsToTheBasket = function() {
                    if (nonPromoItemsNeedToBeChanged.length) {
                        selectedPromoItems = nonPromoItemsNeedToBeChanged.concat(freePromoItemsToBeAdded);
                    }

                    basket.saveItems(selectedPromoItems, function () {
                        $this.onComplete();
                        $('#shoppingCartLocalTPMPopup').popup('close');
                    });
                }

                if (freePromoItemsToBeAdded.length) {
                    $.each(freePromoItemsToBeAdded, function(index, item) {
                        var pricelistPriceSQL = "SELECT * FROM Pricelists WHERE index1='" + g_currentCompany().Pricelist + "' and index3='" + item.ProductID.trim() + "' ";
                        var dao1 = new Dao();
                        dao1.execSQL(pricelistPriceSQL, function(trItem) {
                            freePromoItemsToBeAdded[index].Gross = trItem[0].g;
                            freePromoItemsToBeAdded[index].Discount = 100;
                            freePromoItemsToBeAdded[index].RepNett = 0;
                            freePromoItemsToBeAdded[index].RepDiscount = 100;
                            freePromoItemsToBeAdded[index].RepChangedPrice = true;

                            if (index === freePromoItemsToBeAdded.length - 1) {
                                insertItemsToTheBasket();
                            }
                        }, function() {
                            console.log('Could not find price for product: ' + item.ProductID);
                            if (index === freePromoItemsToBeAdded.length - 1) {
                                insertItemsToTheBasket();
                            }
                        });
                    });

                } else {
                    insertItemsToTheBasket();
                }



//                if (nonPromoItemsNeedToBeChanged.length) {
//                    selectedPromoItems = nonPromoItemsNeedToBeChanged.concat(freePromoItemsToBeAdded);
//                }
//
//                basket.saveItems(selectedPromoItems, function () {
//                    $this.onComplete();
//                    $('#shoppingCartLocalTPMPopup').popup('close');
//                });

            };


            var dao = new Dao();
            dao.index('BasketInfo', $.trim($this.account.AccountID), 'index1',
                function (json){
                    if (json.Type !== 'PROMO' && (json.PromoID === undefined || json.PromoID === null)) {
                        nonPromoItems.push(json);
                    }
                } ,
                undefined,
                processItems
            );
        };

        this.checkOverlapping = function(itemIndex, $this, allFreeItems) {

            var getIntersectionOfTriggerItems = function (array1, array2) {

                if (!array1.length || !array2.length) return [];

                array1.sort();
                array2.sort();

                var result = [];
                var i = 0, j = 0;

                while (i < array1.length && j < array2.length)
                {
                    if (array1[i] < array2[j])
                        i++;
                    else if (array2[j] < array1[i])
                        j++;
                    else /* if array1[i] === array2[j] */
                    {
                        result.push(array2[j++]);
                        i++;
                    }
                }

                return result;
            };


            var promoObjects = [];
            var id = '';
            var promoObj = {};
            var qtySum = 0;

            for (var i = 0; i < allFreeItems.length; ++i) {
                if (id !== allFreeItems[i].TPMID) {
                    if (i !== 0) {
                        promoObjects.push(promoObj);
                    }
                    id = allFreeItems[i].TPMID;
                    promoObj = {};
                    promoObj.TPMID = allFreeItems[i].TPMID;
                    promoObj.Priority = allFreeItems[i].priority;
                    promoObj.triggerItems = allFreeItems[i].triggerItems;
                    promoObj.selected = false;
                    promoObj.promoType = allFreeItems[i].PromoType;

                    qtySum = 0;
                }
                if (i === itemIndex) {
                    promoObj.clickedSelect = true;
                }
                qtySum += parseInt($('#promoItem' + i + 'Qty').val() === '' ? 0 : $('#promoItem' + i + 'Qty').val(), 10);

                if (allFreeItems[i].PromoType === 'FREE')
                    promoObj.selected = qtySum > 0;
                else if (allFreeItems[i].PromoType === 'DISCOUNT') {
                    promoObj.selected = promoObj.clickedSelect;
                }
            }
            promoObjects.push(promoObj);
            var promosPreviousState = $('#localTPMItemsTable tbody');
            for (var i = 0; i < promosPreviousState.length; ++i) {
                promosPreviousState[i] = $(promosPreviousState[i]).hasClass('ui-disabled');
            }
            $('#localTPMItemsTable tbody').removeClass('ui-disabled');

//            $('#localTPMItemsTable .promoItemSelector').removeClass('promoItemSelectBtnRemove');
//            $('#localTPMItemsTable .promoItemSelector').addClass('promoItemSelectBtnAccept');
//            $('#localTPMItemsTable .promoItemSelector .ui-btn-text').text('Accept');

//            if (promoObjects.length === 1) {
//                if (promoObjects[0].selected) {
//                    $('#localTPMItemsTable .promoItemSelector').addClass('promoItemSelectBtnRemove');
//                    $('#localTPMItemsTable .promoItemSelector .ui-btn-text').text('Remove');
//                }
//            } else {
                for (var i=0; i < promoObjects.length; ++i) {
                    for (var j=i; j < promoObjects.length; ++j) {
                        if (i === j) continue;
                        var intersectionArray = getIntersectionOfTriggerItems(promoObjects[i].triggerItems, promoObjects[j].triggerItems);
                        if (intersectionArray.length > 0) {
//                            if (promoObjects[i].selected && promoObjects[i].Priority !== promoObjects[j].Priority && !promosPreviousState[j]) {
//                                $('#localTPMItemsTable tbody:eq(' + j + ')').addClass('ui-disabled');
//
////                                $('#localTPMItemsTable tbody:eq(' + i + ') .promoItemSelector').addClass('promoItemSelectBtnRemove');
////                                $('#localTPMItemsTable tbody:eq(' + i + ') .promoItemSelector .ui-btn-text').text('Remove');
//                            } else if (promoObjects[j].selected && !promoObjects[i].selected && !promosPreviousState[i]) {
//                                $('#localTPMItemsTable tbody:eq(' + i + ')').addClass('ui-disabled');
//
////                                $('#localTPMItemsTable tbody:eq(' + j + ') .promoItemSelector').addClass('promoItemSelectBtnRemove');
////                                $('#localTPMItemsTable tbody:eq(' + j + ') .promoItemSelector .ui-btn-text').text('Remove');
//                                //break;
//                            }
                            if (promoObjects[i].promoType === 'DISCOUNT' && !!promoObjects[i].selected && !promosPreviousState[j]/* && !promoObjects[j].selected && !promosPreviousState[j]*/) {
                                $('#localTPMItemsTable tbody:eq(' + j + ')').addClass('ui-disabled');

//                                $('#localTPMItemsTable tbody:eq(' + i + ') .promoItemSelector').addClass('promoItemSelectBtnRemove');
//                                $('#localTPMItemsTable tbody:eq(' + i + ') .promoItemSelector .ui-btn-text').text('Remove');
                            } else if (promoObjects[j].promoType === 'DISCOUNT' && !!promoObjects[j].selected && !promosPreviousState[i]/* && !promoObjects[i].selected /* && !promosPreviousState[i]*/) {
                                $('#localTPMItemsTable tbody:eq(' + i + ')').addClass('ui-disabled');

//                                $('#localTPMItemsTable tbody:eq(' + j + ') .promoItemSelector').addClass('promoItemSelectBtnRemove');
//                                $('#localTPMItemsTable tbody:eq(' + j + ') .promoItemSelector .ui-btn-text').text('Remove');
                                //break;
                            } else if (promoObjects[i].promoType === 'FREE' && !!promoObjects[i].selected) {
                                $('#localTPMItemsTable tbody:eq(' + j + ')').addClass('ui-disabled');
                            } else if (promoObjects[j].promoType === 'FREE' && !!promoObjects[j].selected) {
                                $('#localTPMItemsTable tbody:eq(' + i + ')').addClass('ui-disabled');
                            }
                        }
                    }
                }
//            }
        };

        this.checkAccountCondition = function(accCondition, $this) {
//            cond.ObjectProperty === 'All' || $.inArray($this.account[cond.ObjectProperty], cond.Values) > -1
            var result = false;
            if (accCondition.ObjectProperty.toLowerCase() === 'all') {
                result = true;
                if (accCondition.Exclusions && accCondition.Exclusions.length) {
                    for(var i = 0; i < accCondition.Exclusions.length; ++i) {
                        result = result && ($this.account[accCondition.Exclusions[i].Attribute] !== accCondition.Exclusions[i].ID.toString());
                    }
                }
            } else {
                if (accCondition.Values && accCondition.Values.length) {
                    for(var i = 0; i < accCondition.Values.length; ++i) {
                        result = result || ($this.account[accCondition.Values[i].Attribute] === accCondition.Values[i].ID.toString());
                    }
                }
            }

            return result;
        };

        this.checkProductCondition = function(productCondition, basketInfo) {
//            $.inArray(json[tpmcond.ObjectProperty], tpmval) > -1
            var result = false;
            if (productCondition && productCondition.length) {
                for(var i = 0; i < productCondition.length; ++i) {
                    result = result || (basketInfo[productCondition[i].Attribute] === productCondition[i].ID.toString());
                }
            }

            return result;
        };
    };

    return {
        getInstance: function(){
              if(!instance){
                  instance = new instanceObj;
              }
              return instance;
        }
    };
})();
