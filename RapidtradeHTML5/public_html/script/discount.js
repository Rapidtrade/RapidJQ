var conditions = [];

/**

 * Work out the conditions for the discount 

 */

function productdetailFetchLocalDiscount() {

    conditions.splice(0, conditions.length);

    //loop through discounts

    for (var x = 0; x < g_discounts.length  ; x++) {

    //Now loop through field conditions

        for (var y = 0; y < g_discountConditions.length; y++) {

            if (g_discounts[x].DiscountID == g_discountConditions[y].DiscountID) {

            //now get the data to compare between discountvalues and either account or product tables

                var condition = new Object();

                condition.Discount = g_discounts[x];

                condition.DiscountField = g_discountConditions[y].DiscountField;

                //either compare against account table or product table 

                if (g_discountConditions[y].RTObject == '#Account') {

                    condition.Value = g_currentCompany()[g_discountConditions[y].DiscountField];

                } else if (g_discountConditions[y].RTObject == '#Product') {

                    condition.Value = g_pricelistSelectedProduct[g_discountConditions[y].DiscountField];

                }

                conditions.push(condition);

            }

        }

    }

    var dao = new Dao();

    dao.cursor('DiscountValues', undefined, undefined, onsuccessDiscountValuesRead, undefined, undefined);

}


/*

 * Now use the conditions to find if a discount exists on discountvalues

 */

function onsuccessDiscountValuesRead(row) {

    var condition = new Object();

    for (var i = 0; i < conditions.length; i++) {

        condition = conditions[i];

        if (row.DiscountID != condition.Discount.DiscountID) {

            continue;

        }

        if (condition.Value != row[condition.DiscountField]) {

            return false;

        }

    }

    if (condition.Discount && condition.Discount.Type == 'PRICE') {

        g_pricelistSelectedProduct.Nett = row.Price;

        g_pricelistSelectedProduct.Discount = 0;

    }

    else if (condition.Discount && condition.Discount.Type == 'DISCOUNT') {

        g_pricelistSelectedProduct.Discount = row.Discount;

        g_pricelistSelectedProduct.Nett = g_pricelistSelectedProduct.Gross - (g_pricelistSelectedProduct.Gross * (g_pricelistSelectedProduct.Discount / 100));

    }

   // $('#discountvalue').html(g_addCommas(parseFloat(g_pricelistSelectedProduct.Discount).toFixed(2)) + '%');

    // $('#nettvalue').html(g_addCommas(parseFloat(g_pricelistSelectedProduct.Nett).toFixed(2)));
    productdetailValue('discount', g_addCommas(g_pricelistSelectedProduct.Discount.toFixed(2)) + '%');
    productdetailValue('nett', g_addCommas(g_pricelistSelectedProduct.Nett.toFixed(2)));
}