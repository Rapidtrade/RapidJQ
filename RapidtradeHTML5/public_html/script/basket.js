var basket = (function() {

    // Private
    
    var savedItems = 0;
    var totalItems = 1;
    var callback = undefined;
    
    // Public
    
    /*
     * saveItem(item)
     * saveItems(itemArray)
     */
    
    return {
        
        saveItem: function(item, quantity, onComplete) {                                     
            
            item.Quantity = item.Quantity || quantity;
            
            if (!item.Quantity) {
                
                log('!!! ERROR: Quantity is not defined for product ' + item.ProductID);
                return;
            }
            
            checkItemFields(item);                        
            callback = onComplete;  
            
            var dao = new Dao();
            dao.put(item, 'BasketInfo', item.key, onItemSaved);
        },
        
        saveItems: function(itemArray, onComplete) {
            
            $.mobile.showPageLoadingMsg();
            
            savedItems = 0;            
            totalItems = itemArray.length;
            
            for (var i = 0; i < totalItems; ++i)
                this.saveItem(itemArray[i], undefined, onComplete);
        }
    }; 
    
    // Private    
    
    function checkItemFields(item) {
        
            item.AccountID = item.AccountID || g_currentCompany().AccountID;
            item.Description = item.Description || item.PromoDescription;
            
            if (isNaN(item.Discount))            
                item.Discount = parseFloat(item.Discount);
            
            item.ProductID = item.ProductID || item.productId || item.PromoProductID;
            
            if (isNaN(item.RepDiscount))            
                item.RepDiscount = parseFloat(item.RepDiscount);                        
        
            item.SupplierID = item.SupplierID || g_currentUser().SupplierID;
            item.Type = item.Type || $.trim(sessionStorage.getItem('currentordertype'));
            
            var unit = item.Unit || item.UOM;
            item.Unit = g_isPackSizeUnitValid(unit) ? unit : '';
            item.UserID = item.UserID || g_currentUser().UserID;            
                        
            item.RepChangedPrice =  item.RepChangedPrice || (item.RepNett && (item.Nett !== item.RepNett));            
            item.key = item.ProductID.trim() + g_currentUser().SupplierID + g_currentUser().UserID + item.AccountID.trim();        
    }
    
    function onItemSaved() {
        
        if (!savedItems++)
            log('Saving ' + totalItems + ' item(s)...');
        
        log('Item ' + savedItems + ' saved.');
        
        if (savedItems === totalItems) {
            
            $.mobile.hidePageLoadingMsg();
            
            if (callback) {
                
                log('Executing callback function...');
                callback();
            }            
        }
    }
    
    function log(text) {
        
        console.log('BASKET: ' + text);
    }
    
})();