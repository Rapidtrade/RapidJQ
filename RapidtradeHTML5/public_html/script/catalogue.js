/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var catalogue = (function() {
    
    // Public
    
    return {
        
        init: function() {
            
            bind();
            fetch();
        }
    };
    
    // Private
    
    function bind() {
        
        $('.ui-btn-left').off().on('click', function() {
            
            g_print('#cataloguePage');
        });
        
        $('.ui-btn-right').off().on('click', function() {

            sessionStorage.setItem('lastPanelId', 'activityPanel');
            $.mobile.changePage('company.html');
        });
    }
    
    function fetch() {
        
        var order = JSON.parse(sessionStorage.getItem('currentOrder'));
        
        var productLinesHtml = '';
        
        for (var i = 0, length = order.orderItems.length; i < length; ++i) {            
            
            if (i % 2 === 0) {
            
                productLinesHtml += '<tr>';
            }
            
            var item = order.orderItems[i];
            
            productLinesHtml += '<td>';          
            
            productLinesHtml += '<img src="' + productdetailGetImageUrl(item.ProductID, 300, false) + '"><br>' +
                    '<table><tr><td>Item</td><td>' + item.ProductID + '</td></tr>' +
                    '<tr><td>Descr</td><td>' + item.Description  + '</td></tr>' +
                    '<tr><td>Pack Size</td><td>' + item.Unit  + '</td></tr>' +
                    '<tr><td>Price (Excl)</td><td>' + item.Nett  + '</td></tr></table>';
            
            productLinesHtml += '</td>';
            
            if (i % 2 === 1) {
            
                productLinesHtml += '</tr>';
            }
        }
        
        $('#productListTable tbody').html(productLinesHtml);               
    }
    
})();