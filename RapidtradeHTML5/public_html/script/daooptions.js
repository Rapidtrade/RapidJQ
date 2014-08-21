var DaoOptions = (function () {
	
	var optionsArray = [];
	
	function constructor() {
	
	}
	
	constructor.get = function(optionName) {
		
		return (jQuery.grep(optionsArray, function (option) {
			return $.trim(option.Name) == optionName;
		}))[0];		
	};
	
	constructor.getValue = function(optionName, defaultValue) {
		
		var option = constructor.get(optionName);
		return option ? option.Value : defaultValue;
	};
	
	constructor.fetchOptions = function(onSuccess) {
		
		optionsArray = [];
		
		var dao = new Dao();
		dao.cursor('Options',undefined, undefined,
				function(option) {
					optionsArray.push(option);
				},
				undefined,
				function() {
                                    
                                    if (onSuccess)
                                        onSuccess();
                                });
	};
	
	return constructor;
})();