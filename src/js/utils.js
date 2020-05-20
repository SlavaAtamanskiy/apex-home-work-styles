(function($) {
  //~~~~~~~~~~~~~~~FORMS~~~~~~~~~~~~~~~~~~//

  //Sets modal form title
  $.fn.setTitleModal = function(title, id, lng) {

    var suff = localize(apex.item(id).isEmpty(), lng);

    title = title + suff;
    apex.util
      .getTopApex()
      .jQuery(".ui-dialog-content")
      .dialog("option", "title", title);

  };

  //Sets form title
  $.fn.setTitle = function(title, id, staticID, lng) {
    var q = "#" + staticID + "_heading";
    var suff = localize(apex.item(id).isEmpty(), lng);
    title = title + suff;
    apex.util
      .getTopApex()
      .jQuery(q)
      .text(title);
  };

  //Sets form title with bread crumbs
  $.fn.setTitleBreadCrumb = function(title, id, className, lng) {
    var suff = localize(apex.item(id).isEmpty(), lng);
    title = title + suff;
    apex.util
      .getTopApex()
      .jQuery(className)
      .last()
      .text(title);
  };

  //Sets form title for the last modal form when multiple modals are opened
  $.fn.setTitleModalLast = function(title, id, lng) {
    var suff = localize(apex.item(id).isEmpty(), lng);
    title = title + suff;
    apex.util
      .getTopApex()
      .jQuery(".ui-dialog-title")
      .last()
      .text(title);
  };

  $.fn.enableTitleHide = function() {

      var prevScrollpos = window.pageYOffset;

       window.onscroll = function() {
            var currentScrollPos = window.pageYOffset;
            if (prevScrollpos > currentScrollPos && currentScrollPos < 20) {
                  document.getElementById("t_Body_title").style.top = "48px";
            } else {
                  document.getElementById("t_Body_title").style.top = "-48px";
            }
            prevScrollpos = currentScrollPos;
        }

  };

  /* Custom redirect from one modal form to another
          params:
          page:   page number to which we want to redirect
          sel:    region or button jQuery selector where dialogue closed event is declared
          params: parameters we want to pass to the form which is being opened

          * the function goes alongside with server call 'GET_URL'
            before using create apex ajax callback 'GET_URL' on the parent page
            and insert the following code:

            PROCEDURE p1_get_url ( 
              p_page_in IN NUMBER, 
              p_params_in IN CLOB, 
              p_triggering_element_in IN VARCHAR2 DEFAULT 'this' ) IS
            
              l_url     CLOB;
              l_app     NUMBER DEFAULT v('APP_ID');
              l_session NUMBER DEFAULT v('APP_SESSION');
              l_params  CLOB DEFAULT nvl( p_params_in, ':' );
            
            BEGIN
            
              l_url := APEX_UTIL.PREPARE_URL ( 
                p_url => 'f?p='||l_app||':'||p_page_in||':'||l_session||'::NO::'||l_params, 
                p_checksum_type => 'SESSION', 
                p_triggering_element => p_triggering_element_in );
              
              apex_json.open_object;
              apex_json.write('success', TRUE);
              apex_json.write('url', l_url);
              apex_json.close_object;
            
            EXCEPTION WHEN OTHERS THEN
            
              apex_json.open_object;
              apex_json.write('success', FALSE);
              apex_json.close_object;
            
            END p1_get_url;

   */
  $.fn.redirectToPage = function(page, sel, params) {
    params = params == undefined ? null : params;
    apex.server.process(
      "GET_URL",
      { x01: page, x02: params },
      {
        dataType: "text",
        success: function(pData) {
          var v_dataParsed = JSON.parse(pData);
          if (v_dataParsed.success) {
            //only dialogue opening is needed
            var lnk = v_dataParsed.url.replace(
              "apex.navigation.dialog.close(true,function(pDialog){ ",
              ""
            );
            lnk = lnk.replace(" });", "");
            lnk = lnk.replace("pDialog", "null");
            //button static id to which we bind close dialogue functionality
            lnk = lnk.replace("this", sel);

            eval(lnk);
          } else {
            apex.message.alert("err: GET_URL proccess failed");
          }
        }
      }
    );
  };

  /* Custom roles management
         params:
         execLogic:   callback function executing roles logic on a form

         * the function goes alongside with server call 'GET_USER_ROLES'
           before using create apex ajax callback 'GET_USER_ROLES' on the page
           and insert the following code:

           DECLARE

               v_roles VARCHAR2(3000) := '';

           BEGIN
               v_roles := common_functionality.get_user_roles;

               apex_json.open_object;
               apex_json.write('success', true);
               apex_json.write('roles', v_roles);
               apex_json.close_object();

            EXCEPTION WHEN OTHERS THEN

               apex_json.open_object;
               apex_json.write('success', false);
               apex_json.close_object;

           END;

           common_functionality package function:

           FUNCTION get_user_roles
              RETURN varchar2 IS
           v_arr APEX_APPLICATION_GLOBAL.VC_ARR2;
           v_res varchar2(3000) := '';
           BEGIN

               if NOT APEX_ACL.HAS_USER_ANY_ROLES (
                       p_application_id  => v('APP_ID'),
                       p_user_name       => v('APP_USER')) then
                       return v_res;
               end if;

               SELECT role_static_id
                  BULK COLLECT INTO v_arr
               FROM APEX_APPL_ACL_USER_ROLES WHERE application_id = v('APP_ID') AND user_name = v('APP_USER');

               v_res := APEX_UTIL.TABLE_TO_STRING(v_arr, ',');

               return v_res;

           END;

           example:
           let callBack = (data)=> {
                 let roles = data.split(',');
                 if (roles.find((r)=>r==='ADMIN') === undefined) {
                     $('#P10_SOMEITEM').prop('disabled', true);
                 }
            }
            $().getUserRoles(callBack);

  */
  $.fn.getUserRoles = function(execLogic) {
    apex.server.process(
      "GET_USER_ROLES",
      { x01: null },
      {
        dataType: "text",
        success: function(pData) {
          var v_dataParsed = JSON.parse(pData);
          if (v_dataParsed.success) {
            //roles management logic
            execLogic(v_dataParsed.roles);
          } else {
            console.log("err: GET_USER_ROLES proccess failed");
          }
        }
      }
    );
  };

  /* Clicabelize report rows
      params:
      Example:
       $(document).ready(()=> {
            $('#our-report-static-ID').addClickableRowsToReport();
       });
*/
  $.fn.clickabelizeReportRows = function() {
    var eventName = "click";

    this.find("tbody tr").each(function(key, val) {
      //exclude header row
      var list = $(val).find("th");
      if (list.length > 0) {
        if ($(list[0]).hasClass("a-IRR-header")) {
          return;
        }
      }

      //get URL to redirect
      var arr = $(val).find("td>a");
      var link;
      var url;
      if (arr.length > 0) {
        link = arr[0];
        url = $(arr[0]).attr("href");
        //disable default behaviour for link
        $(link).on("click", function(e) {
          e.preventDefault();
        });
      }
      if (link) {
        //enable custom behaviour for table row
        $(val).on(eventName, function(e) {
          apex.navigation.redirect(url);
        });
      }
    });
  };

  /* Customizes input number field
        params:
        n_length:       number of digits before decimals (type: Number)
        n_precision:    number of digits after decimal point (type: Number)
        allowNegative:  determines if the number can be negative (true) or
                        only positive numbers are allowed (false) (type: Boolean)
        Example:
         1). id customization:
         $(document).ready(()=> {
              $('#P1_OURITEM').customizeNumberInput(2, 3, true);
         });
         2). class customization:
         $(document).ready(()=> {
              $('.some-items').customizeNumberInput(2, 3, true);
         });
  */
  $.fn.customizeNumberInput = function(n_length, n_precision, allowNegative) {
    var demical, whole;
    demical = "";
    whole = "";
    allowNegative = allowNegative == undefined ? true : allowNegative;
    n_precision = n_precision == undefined ? 0 : n_precision;
    n_length = n_length == undefined ? 0 : n_length;
    for (var i = 0; i < n_precision; i++) {
      demical += "0";
    }
    whole = "0," + demical;

    for (var u = 0; u < this.length; u++) {
      var _id;
      _id = "#" + this[u].id;
      //default value
      //if (apex.item(_id).isEmpty()) {
      //   $(_id).val(0);
      //   console.log(_id);
      //}

      //min value
      if (!allowNegative) {
        $(_id).prop("min", 0);
      }

      //item events
      $(_id)
        .on("input", function(e) {
          var pat;
          var val = this.value;
          if (typeof val !== "string") {
            val = "";
          }
          //autoproceed with decimals logic (decimal point takes place automatically)
          if (n_length === val.length - 1) {
            var suprl = val[val.length - 1];
            var old = val.substr(0, val.length - 1);
            if (suprl != "," && n_precision > 0 && old.indexOf(",") < 0) {
              val = old + "," + suprl;
            }
          }
          //masks
          if (allowNegative) {
            //negative demical
            pat =
              n_precision === 0
                ? "^-?\\d{0," + n_length + "}"
                : "^-?\\d{0," + n_length + "}(\\.\\d{0," + n_precision + "})?";
            val = val.match(new RegExp(pat))[0];
            whole = "-" + whole;
          } else {
            //positive decimals
            pat =
              n_precision === 0
                ? "\\d{0," + n_length + "}"
                : "\\d{0," + n_length + "}(\\.\\d{0," + n_precision + "})?";
            val = val.match(new RegExp(pat))[0];
          }
          //multizero insertion and dot insertion logic
          if (val.length >= 2) {
            if (
              (val[0] == 0 && val[1] != ",") ||
              (val[0] == "," && val[1] == 0)
            ) {
              val = val.substr(val.length - 1);
            } else if (val[0] == "-" && val[1] == "," && val.length === 2) {
              val = "-";
            } else if (val.length === 3) {
              if (val[0] == "-" && val[1] == 0 && val[2] != ",") {
                val = "-" + val.substring(2);
              }
            } else if (val.toString() === whole) {
              val = 0;
            }
          }
          this.value = val;
        })
        .on("blur", function(e) {
          if (typeof this.value === "string" && this.value !== "-") {
            this.value = Number(this.value);
          } else {
            this.value = 0;
          }
        });
    }
  };

  $.fn.putCursorAtEnd = function() {

    return this.each( function() {

      // Cache references
      var $el = $(this),
          el = this;

      // Only focus if input isn't already
      if (!$el.is(":focus")) {
       $el.focus();
      }

      // If this function exists... (IE 9+)
      if (el.setSelectionRange) {

        // Double the length because Opera is inconsistent about whether a carriage return is one character or two.
        var len = $el.val().length * 2;

        // Timeout seems to be required for Blink
        setTimeout(function() {
          el.setSelectionRange(len, len);
        }, 1);

      } else {

        // As a fallback, replace the contents with itself
        // Doesn't work in Chrome, but Chrome supports setSelectionRange
        $el.val($el.val());

      }

      // Scroll to the bottom, in case we're in a tall textarea
      // (Necessary for Firefox and Chrome)
      this.scrollTop = 999999;

    });

  };

  $.fn.enableNotEditableText = function() {
    
    return this.each( function() {
      
      $(this).select( function() {
        
        let sel, range, text, el, val, confirmMsg;
        
        confirmMsg = 'Закріпити виділений текст?'

        if (window.getSelection) {
            sel  = window.getSelection();
            text = sel.toString();
            if (text.length > 0) {

               el = document.getElementById($(this)[0].id);
               apex.message.confirm( confirmMsg, function( okPressed ) { 
                    if( okPressed ) {
                        text = '<span class="home-work-not-editable">' + text + '</span>';
                        val  = el.value;
                        el.value = val.slice(0, el.selectionStart) + text + val.slice(el.selectionEnd);
                    }
               });

            } 

        } else if (document.selection && document.selection.type != "Control") {
            //text = document.selection.createRange().text;
            //TODO: older browsers versions
        }
        
      });

    });

  };

// ADDITIONAL PROCEDURES AND FUNCTIONS

function localize(empty, lng) {

  //default
  var suff = empty ? " (creating)" : " (editing)";

  if (lng) {
    switch (lng) {
      case "uk":
        suff = empty ? " (створення)" : " (редагування)";
        break;
      case "pol":
        suff = empty ? " (tworzenie)" : " (redagowanie)";
        break;
      default:
        suff = empty ? " (creating)" : " (editing)";
    }
  }

  return suff;

}

})(jQuery);
