
function BasketInfo(productID, supplierID, accountID, quantity, userID, nett, description, discount, gross, type, userField01, 
		repChangedPrice, repNett, repDiscount, unit, userField02, warehouse, vat, stock, userField03, userField04,
		userField05, userField06, userField07, userField08, userField09, userField10) {
   
    this.ProductID = productID;
    this.SupplierID = supplierID;
    this.AccountID = accountID;
    this.Quantity = quantity;
    this.UserID = userID;
    this.Nett = nett;
    this.Description = description;
    this.Discount = discount;
    this.Gross = gross;
    
    if (repChangedPrice) {
    	
    	this.RepChangedPrice = repChangedPrice;
	    this.RepNett = repNett;
	    this.RepDiscount = repDiscount;
    }
    
    this.Type = type;
        
    if (unit)
    	this.Unit = unit;
    
    if(stock)
    	this.Stock = stock;
    
    if (userField01)
    	this.UserField01 = userField01;
    
    if (userField02)
    	this.UserField02 = userField02;
    
    if (userField03)
    	this.UserField03 = userField03;
    
    if (userField04)
    	this.UserField04 = userField04;
    
    if (userField05)
    	this.UserField05 = userField05;
    
    if (userField06)
    	this.UserField06 = userField06;
    
    if (userField07)
    	this.UserField07 = userField07;
    
    if (userField08)
    	this.UserField08 = userField08;
    
    if (userField09)
    	this.UserField09 = userField09;
    
    if (userField10)
    	this.UserField10 = userField10;
    
    if (warehouse)
    	this.Warehouse = warehouse;
    
    if (vat != undefined)
    	this.VAT = vat;
    
    this.save = function () {
    	
        var dao = new Dao();
        var getkey = new GetBasketInfoKey(this.ProductID, this.SupplierID, this.UserID, this.AccountID);
        var key = getkey.key;
        var basketinfo = new Object();
        
        basketinfo.ProductID = this.ProductID;
        basketinfo.SupplierID = this.SupplierID;
        basketinfo.AccountID = this.AccountID;
        basketinfo.Quantity = this.Quantity;
        basketinfo.UserID = this.UserID;
        basketinfo.Nett = this.Nett;
        basketinfo.Description = this.Description;
        basketinfo.Discount = this.Discount;
        basketinfo.Gross = this.Gross;
        
        if (this.RepChangedPrice) {
        
        	basketinfo.RepChangedPrice = this.RepChangedPrice;
	        basketinfo.RepNett = this.RepNett;
	        basketinfo.RepDiscount = this.RepDiscount;
        }
        
        if (this.UserField01)
        	basketinfo.UserField01 = this.UserField01;
        
        basketinfo.Unit = this.Unit;
        basketinfo.Stock = this.Stock;
        
        if (this.UserField02)
        	basketinfo.UserField02 = this.UserField02;
        
        if (this.UserField03)
        	basketinfo.UserField03 = this.UserField03;
        
        if (this.UserField04)
        	basketinfo.UserField04 = this.UserField04;
        
        if (this.UserField05)
        	basketinfo.UserField05 = this.UserField05;
        
        if (this.UserField06)
        	basketinfo.UserField06 = this.UserField06;
        
        if (this.UserField07)
        	basketinfo.UserField07 = this.UserField07;
        
        if (this.UserField08)
        	basketinfo.UserField08 = this.UserField08;
        
        if (this.UserField09)
        	basketinfo.UserField09 = this.UserField09;
        
        if (this.UserField10)
        	basketinfo.UserField10 = this.UserField10;
        
        if (this.Warehouse)
        	basketinfo.Warehouse = this.Warehouse;
        
        if (this.VAT != undefined)
        	basketinfo.VAT = this.VAT;
        
        basketinfo.key = key;
        basketinfo.Type = type;
       
        dao.put(basketinfo, 'BasketInfo', key, function() {console.log('Item ' + key + ' added to basket');}, undefined,undefined);   
    };
}

function GetBasketInfoKey(productID, supplierID, userID, accountID) {
    this.key = (productID.trim() + supplierID.trim() + userID.trim() + accountID.trim());
}