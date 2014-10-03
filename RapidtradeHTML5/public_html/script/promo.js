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

            this.fetchTPM(0, this); 
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
                  for (z=0; z < tpm.json.values; z++){ 
                        var val = tpm.json.values[z]; 
                        if ($this.account[cond.ObjectProperty] === val[cond.TPMField] && tpm.mandatory) useTPM  = true; 
                   }  
             } 
             //if promo not for this customer, then move on to next promo 
             if (!useTPM ){ 
                 tpmcount += 1; 
                 $this.fetchTPM(tpmcount, $this); 
             }  
             //valid promo for this account, so check conditions 
             $this.checkCondition(tpm, 0, $this); 
        } 
 
        // run through conditions one at a time 
        this.checkCondition = function(tpm, condcount,$this) {
            //been through all conditions, so move onto next tpm 
            if (condcount = tpm.json.productConditions.length) { 
                 $this.tpmcount  += 1; 
                 $this.fetchTPM($this.tpmcount, $this); 
            } 
            
            var cond = tpm.settings.productConditions[condcount]; 
            
            for (z=0; z < tpm.json.values; z++){ 
                  var val = tpm.json.values[z]; 
                  $this.checkbasket(user, account, cond, val, condcount, this);                    
            }  
        }    
        
        //this function checks if the should be in the basket 
        this.checkbasket = function(tpm, account, tpmcond, tpmval, condcount, $this) { 
            var qty = 0; 
            dao.index('shoppingcart',  
                               'index1', 
                                account.accountid,     
                                function (json){ 
                                    // add up quantities as may be checking quantity of all products in a category  
                                    //NB. For below to work, you may need to add product.categoryname to shopping cart fields. 
                                    if (json[tpmcond.ObjectProperty] === tpmval.TPMField){ 
                                        qty += json.Quantity 
                                    } 
                                } , 
                                undefined, 
                                function (){ 
                                    if (qty > tpmval.buyqty){ 
                                           $this.savePromotion(user, account, tpm,  tpmcond, tpmval, qty, condcount, $this); 
                                    }  else {    
                                          //delete the promo from shopping cart if it does exist and move onto next condition. 
                                           var key = tpm.promoproductid + supplierid + accountid + tpm.tpmid ; 
                                           doa.delete('basketinfo',key); 
                                           condcount+= 1; 
                                            $this.checkCondition(tpm, condcount);            
                                    } 
                                } 
                             );  
        }  
        
        //add or modify promo in the basket 
        this.savePromotion = function(user, account,tpm, tpmcond, tpmval, qty, condcount, $this){ 
             //NB.  Cint() must remove the remainder, ie 2.9 becomes 2 and should not be rounded up to 3 
             //eg. If the promo is buy 24, get 1 free, and they buy 65, then 65/24 = 2.7083 , but should be round down to 2 
             var freeqty = cint((qty / tpmval.buyqty)) * tpmval.freeqty; 

            //now read local database to see I promo exists in cart, if it does, amend, if not, then add 
            var key = tpm.promoproductid + supplierid + accountid + tpm.tpmid ;
            Dao.get('basketinfo',key, 
                function(json){ 
                     //this Tpm exists in cart, so update qty 
                     Json.quantity = freeqty 
                     Dao.put(json); 
                },  
                function(err){ 
                      //this promo does not exist in basket, so add it 
                     var json = {} 
                     json.key = key; 
                     json.supplierid = user.supplierid; 
                     json.accountid = account.accountid; 
                     json.tpmid = tpm.tpmid; 
//                    etc. etc. 
                    Dao.put(json);        
                }, 
                function () { 
                    //on complete of get, move onto next condition 
                    condcount+= 1; 
                    $this.checkCondition(tpm, condcount) 
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
