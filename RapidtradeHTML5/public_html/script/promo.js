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
        
        this.checkMandatoryPromos = function (user, account, onComplete) { 
            
            this.onComplete = onComplete; //store complete function for later use 
            this.user = user; 
            this.account = account; 
            this.tpms = [];
            
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
                //we have finished checking all promo's, so run onComplete 
                $this.onComplete(); 
                return; 
            } 
            $this.tpmcount = tpmcount; //store for later 
            var tpm = $this.tpms[tpmcount]; 
            //see if this customer should get this tpm 
            var useTPM = false; 
            for (var y=0; y < tpm.json.accountConditions.length; y++) { 
                var cond = tpm.json.accountConditions[y]; 
                for (z=0; z < tpm.json.values.length; z++){ 
                      var val = tpm.json.values[z]; 
                      if ($this.account[cond.ObjectProperty] === val[cond.TPMField] && tpm.json.mandatory) useTPM  = true; 
                 }  
             } 
             
             // TEST
             useTPM = true;
             
             //if promo not for this customer, then move on to next promo 
             if (!useTPM ){ 
                 tpmcount += 1; 
                 $this.fetchTPM(tpmcount, $this); 
                 return;
             }  
             //valid promo for this account, so check conditions 
             $this.checkCondition(tpm, 0, $this); 
        } 
 
        // run through conditions one at a time 
        this.checkCondition = function(tpm, condcount, $this) {
            //been through all conditions, so move onto next tpm 
            if (condcount === tpm.json.productConditions.length) { 
                 $this.tpmcount += 1; 
                 $this.fetchTPM($this.tpmcount, $this); 
                 return;
            } 
            
            var cond = tpm.json.productConditions[condcount]; 
            
            for (z=0; z < tpm.json.values.length; z++){ 
                  var val = tpm.json.values[z]; 
                  $this.checkbasket(tpm, $this.user, $this.account, cond, val, condcount, this);                    
            }  
        }    
        
        //this function checks if the should be in the basket 
        this.checkbasket = function(tpm, user, account, tpmcond, tpmval, condcount, $this) { 
            var qty = 0; 
            var dao = new Dao();
            dao.index('BasketInfo', $.trim(account.AccountID), 'index1',                                      
                                function (json){ 
                                    // add up quantities as may be checking quantity of all products in a category  
                                    //NB. For below to work, you may need to add product.categoryname to shopping cart fields. 
                                    
                                    // TEST
                                    if (json.Type !== 'PROMO' /*json[tpmcond.ObjectProperty] === tpmval[tpmcond.TPMField]*/){ 
                                        qty += json.Quantity; 
                                    } 
                                } , 
                                undefined, 
                                function (){ 
                                    if (qty >= tpmval.BuyQty){ 
                                        $this.savePromotion(user, account, tpm,  tpmcond, tpmval, qty, condcount, $this); 
                                    }  else {    
                                        //delete the promo from shopping cart if it does exist and move onto next condition. 
                                        var key = tpmval.PromoProductID + user.SupplierID + user.UserID + account.AccountID; 
                                        dao.deleteItem('BasketInfo', key); 
                                        condcount += 1; 
                                        $this.checkCondition(tpm, condcount, $this);            
                                    } 
                                } 
                             );  
        }  
        
        //add or modify promo in the basket 
        this.savePromotion = function(user, account, tpm, tpmcond, tpmval, qty, condcount, $this){ 
             //NB.  Math.floor will remove the remainder, ie 2.9 becomes 2 and should not be rounded up to 3 
             //eg. If the promo is buy 24, get 1 free, and they buy 65, then 65/24 = 2.7083 , but should be round down to 2 
             var freeqty = Math.floor((qty / tpmval.BuyQty)) * tpmval.FreeQty; 

            //now read local database to see if promo exists in cart, if it does, amend, if not, then add 
            var key = tpmval.PromoProductID + user.SupplierID + user.UserID + account.AccountID;
            
            var dao = new Dao();
            dao.get('BasketInfo',key, 
                function(json){ 
                    
                    //this Tpm exists in cart, so update qty                      
                    g_addProductToBasket(tpmval.PromoProductID, user.SupplierID, account.AccountID, freeqty, user.UserID, '0.00', tpmval.PromoDescription, '0.00', '0.00', 'PROMO');
                },  
                function(err){ 
                    
                    //this promo does not exist in basket, so add it 
                    g_addProductToBasket(tpmval.PromoProductID, user.SupplierID, account.AccountID, freeqty, user.UserID, '0.00', tpmval.PromoDescription, '0.00', '0.00', 'PROMO');    
                }, 
                function () { 
                    
                    //on complete of get, move onto next condition 
                    condcount+= 1; 
                    $this.checkCondition(tpm, condcount, $this); 
                 }); 
        }        
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
