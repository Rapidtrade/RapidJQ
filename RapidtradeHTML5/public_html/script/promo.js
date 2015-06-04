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
        this.mathcingTPMs = [];
        
        this.checkMandatoryPromos = function (user, account, onComplete) { 
            
            this.onComplete = onComplete; //store complete function for later use 
            this.user = user; 
            this.account = account; 
            this.tpms = [];
            this.mathcingTPMs = [];
            
            var $this = this;
            
            var dao= new Dao();            
            dao.cursor('TPM', '', '', function(item) {
                
                item.json = JSON.parse(item.json);
                $this.tpms.push(item);
                
            }, onComplete, function() {
                
               $this.fetchTPM(0, $this); 
            });             
        } 

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
                    if ($.inArray($this.account[cond.ObjectProperty], cond.Values) > -1) useTPM  = true; 
                
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
            var dao = new Dao();
            dao.index('BasketInfo', $.trim(account.AccountID), 'index1',                                      
                                function (json){ 
                                    // add up quantities as may be checking quantity of all products in a category  
                                    //NB. For below to work, you may need to add product.categoryname to shopping cart fields. 
                                    
                                    // TEST
                                    if (/*json.Type !== 'PROMO'*/ $.inArray(json[tpmcond.ObjectProperty], tpmval) > -1) { 
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
                                        tpm.matchingConditions.push(condcount);
                                        tpm.matchingQtys += qty;
                                    }  else {    
                                        //delete the promo from shopping cart if it does exist and move onto next condition. 
                                        for (var x = 0; x < tpmcond.Free.length; ++x) {
                                            var key = tpmcond.Free[x].ID + user.SupplierID + user.UserID + account.AccountID; 
                                            dao.deleteItem('BasketInfo', key); 
                                        }
                                        
                                    } 
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
                var itemsHTMLHeader = '<thead><tr><th>Promotion</th><th>Product</th><th>Description</th><th>Quantity</th></tr></thead>';
                var itemsHTML = '';
                var allFreeItems = [];
                for (var i = 0; i < $this.mathcingTPMs.length; ++i) {
                    var tpm = $this.mathcingTPMs[i];
                    // first we have to sum all free items for this promotion
                    var freeItemsCount = 0;
                    for (var j = 0; j < tpm.matchingConditions.length; ++j) {
                        var prodCond = tpm.json.productConditions[tpm.matchingConditions[j]];
                        freeItemsCount += prodCond.Free.length;                        
                    }
                    var maxQty = Math.floor((tpm.matchingQtys / tpm.json.BuyQty)) * tpm.json.FreeQty;
                    var maxQtyPerItem = Math.floor((maxQty / freeItemsCount));
                    itemsHTML += '<tbody data-promotion-index="' + i + '" data-max-qty="' + maxQty +'">';
                    for (var j = 0; j < tpm.matchingConditions.length; ++j) {
                        var tpmcond = tpm.json.productConditions[tpm.matchingConditions[j]];
                        for (var x = 0; x < tpmcond.Free.length; ++x) {
                            var item = {};
                            item.TPMID = tpm.TPMID;
                            item.ProductID = tpmcond.Free[x].ID;
                            item.Description = tpmcond.Free[x].Description;
                            item.MaxQty = maxQty;
                            
                            itemsHTML += '<tr><td>' + tpm.TPMID + '</td>';
                            itemsHTML += '<td>' + tpmcond.Free[x].ID + '</td>';
                            itemsHTML += '<td>' + tpmcond.Free[x].Description + '</td>';
                            itemsHTML += '<td><input id="promoItem' + allFreeItems.length + 'Qty" type="number" min="0" max="' + maxQty + '" + value="' + maxQtyPerItem+ '" style="width: 100%;"/></td></tr>'; 
                            
                            allFreeItems.push(item);
                        }                        
                    }
                    itemsHTML += '</tbody>';
                }
                
                $('#localTPMItemsTable').html(itemsHTMLHeader + itemsHTML);
                $('#shoppingCartLocalTPMPopup').popup('open');

                $('#localTPMItemsTable tbody input').keydown(function(event) {
                    return g_isValidQuantityCharPressed(event);
                });

                $('#shoppingCartLocalTPMOK').off().on('click', function() {
                    var promoItemQtys = $('#localTPMItemsTable tbody input');
                    var qtySum = 0;
                    var promID = '';
                    var qtyOK = true;
                    for (var i = 0; i < promoItemQtys.length; ++i) {
                        if (promID !== allFreeItems[i].TPMID) {
                            promID = allFreeItems[i].TPMID;
                            qtySum = 0;
                        }
                        qtySum += parseInt($('#promoItem' + i + 'Qty').val() === '' ? 0 : $('#promoItem' + i + 'Qty').val(), 10);
                        
                        qtyOK = qtySum <= allFreeItems[i].MaxQty;
                        
                        if (!qtyOK) {
                            break;
                        }
                    }
                    if (!qtyOK) {
                        g_alert('Max free quantity has been exceeded');
                        return;
                    } else {
                        var prItems = [];
                        for (var x = 0; x < allFreeItems.length; ++x) {
                            var item = {};
                            item.ProductID = allFreeItems[x].ProductID;
                            item.Description = allFreeItems[x].Description;
                            item.Nett = '0.00';
                            item.Discount = '0.00';
                            item.Gross = '0.00';
                            item.Type = 'PROMO';
                            item.PromoID = allFreeItems[x].TPMID;
                            item.Quantity = parseInt($('#promoItem' + x + 'Qty').val() === '' ? 0 : $('#promoItem' + x + 'Qty').val(), 10);

                            prItems.push(item);
                        }

                        basket.saveItems(prItems, function () {
                            $this.onComplete();
                            $('#shoppingCartLocalTPMPopup').popup('close');
                        });

                    }

                });
                $('#shoppingCartLocalTPMCancel').off().on('click', function() {
                    $('#shoppingCartLocalTPMPopup').popup('close');
                });
            }
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
