function orderprintOnPageShow() {
	
	var dao = new Dao();
	dao.openDB(function (user) { orderprintInit(); });
	orderprintBind();
}

function orderprintInit() {
		
	var orderType = sessionStorage.getItem('ordertypecaption');
	$('#orderprintCaption').text((orderType ? orderType : 'Order') + ' Confirmation');
	
	$('#logo').attr('src', 'http://online.rapidtrade.biz/images/' + g_currentUser().SupplierID.toUpperCase() + '/' + g_currentUser().SupplierID.toLowerCase() + '.png ');
	
	$('#orderedBy').html('<h3>Ordered by:</h3>' + g_currentUser().UserID + '<br/>' + g_currentCompany().AccountID + '<br/>' + g_currentCompany().Name);
	$('#date').text(g_today());
	
	orderprintFetchOrder();
}

function orderprintBind() {
	
	$('#printButton').click(function() {
            g_print('#orderprintpage');
	});

}

function orderprintFetchOrder() {
	
	var order = JSON.parse(sessionStorage.getItem("currentOrder"));
	
	$('#id').text(order.UserField01);	
	$('#comment').text(order.Reference);
	
	var productLinesHtml = '';
	var quantityTotal = 0;
	var subTotal = 0;

	$.each(order.orderItems, function() {
		
		productLinesHtml += '<tr><td>'  + this.ProductID + 
							'</td><td>' + this.Description +
							'</td><td>' + this.Quantity +
							'</td><td>' + this.Discount +
							'</td><td>' + this.Nett +
							'</td><td>' + this.Value +
							'</td></tr>';
		
		quantityTotal += this.Quantity;
		subTotal += parseFloat(this.Value);
	});
	g_append('#productListTable tbody', productLinesHtml);
	$('#quantityTotal').text(quantityTotal);
	$('#subTotal').text(g_roundToTwoDecimals(subTotal));
    
	var vat = subTotal * g_vat();
	$('#vat').text(g_roundToTwoDecimals(vat));
	$('#total').text(g_roundToTwoDecimals(parseFloat(subTotal) + parseFloat(vat)));
}