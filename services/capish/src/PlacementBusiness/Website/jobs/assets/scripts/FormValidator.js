(function($){

	$.fn.validateInputs = function(invokeOnInvalid, lockIfValid) {

        var valid = true;
		
		this.each(function(){
            $(this)
                .find("input[type='checkbox'], input[type='text'], input[type='password'], select, textarea")
	            .filter(":enabled")
	            .each(function() {
		            if ( !validateField(this) )
		            {
		                valid = false;
		                if (invokeOnInvalid != null && typeof(invokeOnInvalid) == "function")
		                    invokeOnInvalid(this);
		            }
	            });
		});
		
		if (!validateRadioButtonGroups(this))
		    valid = false;
		    
		return valid;
	};
	
	$.fn.autoValidate = function() {
		return this.each(function() {
            $(this)
                .find("input[type='checkbox'], input[type='text'], input[type='password'], select, textarea")
	            .filter(".Required:enabled, .Regex:enabled, .ValidationExpression:enabled")
	            .blur(function() { validateField(this); })
	            .change(function() { validateField(this); });
		});
	};

})(jQuery);

function validateField(sender) {

    var element = $(sender);
    
    if (
            ( element.is('.Required') && ( element.val() == '' || element.val() == "0" || element.is('input[type=checkbox]:not(:checked)') ) ) ||
            ( element.is('.Regex') && !new RegExp(element.attr("regex"), "gi").test(element.val()) && element.val() != "" ) ||
            ( element.is('.ValidationExpression') && !eval( element.attr("validationExpression") ) )
       )
    {
        element.addClass('Invalid');
        
        if (typeof(element.attr('error')) != "undefined" && element.attr('error') != null)
        {
        	if (element.parent().find('.error').length == 0)
            	$("<div id='error" + element.attr('id') +"' class='error'>" + element.attr('error') + "</div>")
                .show()
                .insertAfter(element);
        }
        return false;
    }
    else
    {
        element.removeClass('Invalid');
        element.parent().find('.error').remove();
        return true;
    }
}

function validateRadioButtonGroups(container)
{
    var valid = true;
    
    container.find('input.Required[type=radio]')
        .each(function() {
            var group = container.find('input[type=radio][name=' + $(this).attr('name') + ']');
            if (group.filter(':checked').length == 0)
            {
                valid = false;
                group.parent().find('.error').show();
            }
            else
            {
                group.parent().find('.error').hide();
            }
        });
        
    return valid;
}

function fadeInAndOutInvalid(sender, num) 
{
    if (!num || num > 0)
        $(sender).fadeOut(300, function() { 
            $(this).fadeIn(300); 
            if (num)
                fadeInAndOutInvalid(sender, num - 1);
        });
}
