import config from "./config";
import * as global from "./global";

import ReactDOM from "react-dom";
import React from "react";
import CodeRedeem from "../components/CodeRedeem";

var checklogin = function() {
	$.ajax({
		type: "GET",
		url: "/no-cache/profileSystem/getProfile",
		data: {},
		success: function(res) {
			if (typeof res.IsUserDefined == "undefined" || !res.IsUserDefined) location.href = "/login?ReturnUrl=/mis-pedidos";
		}
	});
};

var IEVersion = Fizzmod.Utils.detectIE();
if (IEVersion != 9 && IEVersion != 8)
	checklogin();

var GTMEvent = window.location.pathname.split("/");
if (GTMEvent.length) {
	var GTMHelper = new vtexTagManagerHelper(GTMEvent[GTMEvent.length - 1]);
	GTMHelper.init();
}

var orders_data = {};

$(document).ready(function() {

	// checklogin();

	$.ajax({
		type: "GET",
		url: "/api/checkout/pub/orders/?",
		data: {},
		success: function(orders) {

			var ordersTemplate = {};
			if (orders.length > 0) {

				var iorder = 1;
				var orderCancel=
				[ 	'payment-pending', 
					'payment-approved'
				];
				
		
				$.each(orders, function(i, order) {
					switch (order.state) {
						case "payment-approved":
						default:
							var title = "Compra realizada el";
							break;
					}

					if (IEVersion == 8 || IEVersion == 9) {
						var date = new Date(order.creationDate.split(".")[0]);
					} else
						var date = new Date(order.creationDate);

					var datestr = date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();

					var total = 0,
						subtotal = 0,
						taxes = 0,
						shipping = 0,
						discount = 0;

					if (typeof order.value != "undefined") {
						total = order.value / 100;
						total = config.priceCurrency + Fizzmod.Utils.formatPrice(total, config.priceThousands, config.priceCents, config.priceCentsLength);
					}

					if (typeof order.totals != "undefined" && order.totals.length > 0) {
						$.each(order.totals, function(it, total) {
							switch (total.id) {
								case "Items":
									subtotal = total.value / 100;
									subtotal = config.priceCurrency + Fizzmod.Utils.formatPrice(subtotal, config.priceThousands, config.priceCents, config.priceCentsLength);
									break;
								case "Discounts":
									discount = total.value / 100;
									discount = config.priceCurrency + Fizzmod.Utils.formatPrice(discount, config.priceThousands, config.priceCents, config.priceCentsLength);
									break;
								case "Shipping":
									shipping = total.value / 100;
									shipping = config.priceCurrency + Fizzmod.Utils.formatPrice(shipping, config.priceThousands, config.priceCents, config.priceCentsLength);
									break;
								case "Tax":
									taxes = total.value / 100;
									taxes = config.priceCurrency + Fizzmod.Utils.formatPrice(taxes, config.priceThousands, config.priceCents, config.priceCentsLength);
									break;
							}
						});
					}

					var paymentData = "",
						shippingData = "",
						personalData = "",
						statusData = "";

					if (typeof order.shippingData.address != "undefined") {

						var address = order.shippingData.address;

						shippingData += typeof address.receiverName != "undefined" ? address.receiverName + "<br />" : "";
						shippingData += typeof address.street != "undefined" ? address.street + "<br />" : "";
						
						var addressLocation = "";

						if(typeof address.neighborhood != "undefined" && address.neighborhood != null) addressLocation += " / "+address.neighborhood;
						if(typeof address.city != "undefined" && address.city != null) addressLocation += " / "+address.city;
						if(typeof address.state != "undefined" && address.state != null) addressLocation += " / "+address.state;

						addressLocation = addressLocation.substr(3);

						shippingData += addressLocation + "<br />";

						shippingData += typeof address.country != "undefined" ? address.country + "<br />" : "";
						shippingData += typeof address.postalCode != "undefined" ? address.postalCode + "<br />" : "";
					}

					if (typeof order.clientProfileData != "undefined") {
						personalData += typeof order.clientProfileData.firstName != "undefined" && typeof order.clientProfileData.lastName != "undefined" ? order.clientProfileData.firstName + " " + order.clientProfileData.lastName + "<br />" : "";
						personalData += typeof order.clientProfileData.email != "undefined" ? order.clientProfileData.email + "<br />" : "";
						personalData += typeof order.clientProfileData.document != "undefined" ? order.clientProfileData.document + "<br />" : "";
						personalData += typeof order.clientProfileData.phone != "undefined" ? order.clientProfileData.phone + "<br />" : "";
					}

					try {
						var installments = null;
						if (order.paymentData.transactions[0].payments[0].group == "creditCard") {
							installments = order.paymentData.transactions[0].payments[0].installments;
							
							if(__mxsony__ || __pasony__) {
								var installmentsText = " (" + installments + (installments > 1 ? " mensualidades" : " mensualidad") + ")";
							} else {
								var installmentsText = " (" + installments + (installments > 1 ? " cuotas" : " cuota") + ")";
							}

							paymentData += "Tarjeta de crédito <b>" + order.paymentData.transactions[0].payments[0].paymentSystemName + "</b> finalizada en " + order.paymentData.transactions[0].payments[0].lastDigits;

						} else {
							paymentData += order.paymentData.transactions[0].payments[0].paymentSystemName;
						}
						paymentData += " - " + total + (installments ? installmentsText : "");


					} catch (e) {
						paymentData = "";
                    }
                    var statusText = {
						"payment-pending": "Pago pendiente",
						"payment-approved": "Pago aprobado",
						"canceled": "Cancelado",
						"cancel": "Cancelación solicitada",
						"invoiced": "Facturado",
						"shipped": "Envíado",
						"window-to-cancel": "Cancelación disponible",
						"ready-for-handling": "Iniciando el proceso de despacho",
						"start-handling": "Preparando el despacho",
						"handling": "Entregado al transportista",
						"shipping-notification": "Entregado",
					};
					var cancelActiveValidate='hide';
					var StatusOrder=order.state in statusText ? statusText[order.state] : order.state;
					if(__arsonyb2c__ || __sonyar__){
						if(orderCancel.includes(order.state)){
							if(sessionStorage.getItem('cancelOrder')==order.orderId){
								StatusOrder="Cancelación solicitada";
							}else{
								$.ajax({
									url: "/api/dataentities/CO/search?_fields=orderID&_where=(orderID='"+order.orderId+"')",
									async: false,
									success: function(orders) {
										if(orders==""){
											cancelActiveValidate="show";
										}else{
											StatusOrder="Cancelación solicitada";
										}
									}
								})
							}
							
							
						}
					}
					var orderTrackingValidate='hide';
					var trackingNumber='';
					var trackingUrl='';
						$.ajax({
							url: "/api/dataentities/OT/search?_fields=orderID,trackingNumber,trackingUrl&_where=(orderID='"+order.orderId+"')",
							async: false,
							success: function(orders) {
								if(orders.length>0){
									StatusOrder="Enviado";
									orderTrackingValidate="show";
									trackingNumber=orders[0]['trackingNumber']
									trackingUrl=orders[0]['trackingUrl']
								}			
							}
						})
					var data = {
						orderId: order.orderId,
						extraClass: iorder == 1 ? "" : "",
						title: title,
						date: datestr,
						data: {
							payment: paymentData,
							shipping: shippingData,
							personal: personalData,
							status: statusData,
						},
						subtotal: subtotal,
						taxes: taxes,
						shipping: shipping,
						discount: discount,
						total: total,
						shippingMethod: "-",
						status: StatusOrder,
						statusClass: order.state,
						cancelActive: cancelActiveValidate,
						orderTracking:orderTrackingValidate,
						trackingN:trackingNumber,
						trackingU:trackingUrl
						
					};

					var o = $("#tmpl-order").tmpl(data);

					//$(".myorders .orders").append(o);

					orders_data[order.orderId] = {
						id: order.orderId,
						status: order.state,
						date: date,
						products: [],
						products_code: [],
						orderProducts: [],
						sequence: order.orderId
					};

					if (order.items.length > 0) {

						var iprod = 1;

						$.each(order.items, function(ii, item) {

							var price = item.sellingPrice / 100;
							price = config.priceCurrency + Fizzmod.Utils.formatPrice(price, config.priceThousands, config.priceCents, config.priceCentsLength);

							var listPrice = item.listPrice != item.sellingPrice ? item.listPrice / 100 : 0;
							listPrice = listPrice == 0 ? "" : config.priceCurrency + Fizzmod.Utils.formatPrice(listPrice, config.priceThousands, config.priceCents, config.priceCentsLength);

							var showListPrice = listPrice == "" ? "hide" : "";

							var total = item.sellingPrice / 100 * item.quantity;
							total = config.priceCurrency + Fizzmod.Utils.formatPrice(total, config.priceThousands, config.priceCents, config.priceCentsLength);

							var data_prod = {
								prod: item.id,
								extraClass: iprod == 1 ? "first" : (iprod == order.items.length ? "last" : ""),
								url: item.detailUrl,
								image: item.imageUrl,
								title: item.name,
								code: item.refId,
								shipping: data.shipping,
								showListPrice: showListPrice,
								listPrice: listPrice,
								price: price,
								quantity: item.quantity,
								total: total
							};

							var prod = $("#tmpl-item").tmpl(data_prod);
							o.find(".items").append(prod);
							// $(".myorders .orders .order-"+data.orderId+" .items").append(prod);

							orders_data[order.orderId].products.push(item.name);
							orders_data[order.orderId].products_code.push(item.refId);
							orders_data[order.orderId].orderProducts.push({
								id: item.id,
								quantity: item.quantity,
								categories: item.productCategories
							});

							global.fixPrice();

							iprod++;

						});
					}
					ordersTemplate[date] = o;

					iorder++;



				});

				var ordered = Object.keys(ordersTemplate);
				ordered.sort(function(a, b) {
					return new Date(b) - new Date(a);
				});

				$.each(ordered, function(i, value) {
					$(".myorders .orders").append(ordersTemplate[value].addClass(i == 0 ? "active first" : ""));
				});
				if(__arsonyb2c__ || __sonyar__){
					let countCodePSN=0;
					$.each(orders_data, function(_, order) {
						// PSN Code Redeem Handler
						$.each(order.orderProducts, function(_, product) {
							const orderContainer = document.querySelector(".order-" + order.id);
							const orderStatusCodeRedeem=
								[ 	'invoiced', 
									'shipped', 
									'window-to-cancel', 
									'ready-for-handling', 
									'start-handling', 
									'handling', 
									'shipping-notification', 
								];
	

							if(orderStatusCodeRedeem.includes(order.status)  && config.psnCategoryId in product.categories ) {
								ReactDOM.render(
									<CodeRedeem order={order.id} product={product.id} isOnlyOneProd={product.quantity == 1} />,
									orderContainer.querySelector(".js-psn-code-" + product.id)
								);
								countCodePSN++
							} else if(order.status == "payment-approved" && config.psnCategoryId in product.categories){
								const element = (
									<div className="psn-code__btn--error err_approved" >
										¡Una vez tu pedido sea facturado podrás acceder a tu código PSN!
									</div>
								);
								ReactDOM.render(element,orderContainer.querySelector(".js-psn-code-" + product.id));
								countCodePSN++
							}else{
								orderContainer.querySelector(".js-psn-code-" + product.id).remove();
							}
							if(!countCodePSN){

								orderContainer.querySelector(".th.product").classList.add("full");
								orderContainer.querySelector(".td.product").classList.add("full");
							}
						})
					});
				}

			} else {
				$(".myorders .orders .no-orders").show();
			}

			$(".myorders .loading-orders").fadeOut(100);

		}
	});

	$(".myorders .orders").on("click", ".order > .title", function() {

		var order = $(this).closest(".order");
		var content = order.find(".content").eq(0);

		if (order.hasClass("active")) {
			content.slideUp(300, function() {
				order.removeClass("active");
			});
		} else {
			content.slideDown(300, function() {
				order.addClass("active");
			});
		}

	});


	$(".myorders .wrap-search .search").on("click", filter_orders);

	$(".myorders .wrap-search input").keydown(function(e) {
		if (e.keyCode == 13) filter_orders();
	});

	$(".myorders .filters .selector").on("select", filter_orders);

	$(".myorders .orders").on("click", ".btn.reset", function() {

		$(".myorders .loading-orders").stop(true, true).fadeIn(100);
		$(".myorders .orders .no-filter-orders").stop(true, true).fadeOut(100);

		$(".myorders .filters .selector, .myorders .wrap-search input").trigger("reset");

		$(".myorders .orders .order").stop(true, true).fadeIn(100);

		$(".myorders .loading-orders").stop(true, true).fadeOut(100);

	});

	/*var buttonCancel=".box.cancel";
	$(document).on('click',buttonCancel,function(){
		var idOrder = $(this).attr('orderid');
		if(idOrder){
			$(this).siblings('#cancelType').fadeIn();
		}*/

		/*if(idOrder){
			$(this).addClass('active');
			$.ajax({
				url: "/api/oms/pvt/orders/"+idOrder+"/cancel",
				type: "POST",
				success: function(data) {
				    location.reload();
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) { 
					console.log('Error',XMLHttpRequest,textStatus,errorThrown);
				} 
			})
		}*/

	//})
	if(__arsonyb2c__ || __sonyar__){
		//Boton de cancelación 
		var buttonCancel=".box.cancel";
		var email="";
		$(document).on('click',buttonCancel,function(){
			var idOrder = $(this).attr('orderid');
			$(this).fadeOut();
			if(idOrder){
				var element=$(this).parents('.more-data').siblings('.BoxCancel');
				$.ajax({
					type: "get",
					url: "/no-cache/profileSystem/getProfile",
				}).done(function (res) {
					if (res.IsUserDefined) {
						var name = res.FirstName;
						element.find('.nameOrder').text('¡Hola '+name+'!')
						element.fadeIn();
						email=res.Email
					}
				})
			}
		})

        $(document).on('change','#cancelType',function(){
			$(this).parents('.BoxCancel').find('.errorcancelType').text("");
            var reason=$(this).val();
            if(reason=="Otro"){
                $(this).siblings('.boxReason').fadeIn();
            }else{
                $(this).siblings('.boxReason').fadeOut();
            }
		})

		$(document).on('click','.confirmCancel',function(){
			var selectReason=$(this).parents('.BoxCancel').find('select').val();
			if(!selectReason){
				var errorReason="Por favor selecione el motivo de cancelación";
				$(this).parents('.BoxCancel').find('.errorcancelType').text(errorReason);
			}else{
				var reasonText=selectReason;
				if(selectReason=="Otro"){
					reasonText=$(this).parents('.BoxCancel').find('textarea').val();
				}
				if(!reasonText || reasonText==""){
					var error="Por favor escribe un motivo de cancalción";
					$(this).parents('.BoxCancel').find('.errorcancelReason').text(error);
				}else{
					$(this).parents('.BoxCancel').find('.errorcancelReason').text("");
					console.log('reasonText',reasonText);
					var Correo=email;
					var orderId=$(this).parents('.BoxCancel').siblings('.more-data').find('.wrap.orderid .value').text();
					var typePayment=$(this).parents('.BoxCancel').siblings('.data').find('.box.payment .value').text();
					saveCancel(Correo,orderId,typePayment,reasonText,$(this));
				}
			}
		})

		function saveCancel(Correo,orderId,typePayment,reasonText,button){
			if(Correo!="" && orderId !="" && typePayment !="" && reasonText!=""){
				var datosInput = {};
					datosInput["email"] = Correo;
					datosInput["orderID"] = orderId;
					datosInput["ReasonForCancellation"] =reasonText;
					datosInput["wayToPay"] = typePayment;
   
					console.log('datosInput',datosInput);
					button.addClass('active');

				var contentPost = {
					url: "/api/ds/pub/documents/CO",
					contentType: 'application/json; charset=utf-8',
					data: JSON.stringify(datosInput),
					type: "POST",
					success: function (data) {
						sessionStorage.setItem('cancelOrder', orderId);
						location.reload();
					},
					error: function (data) {
						button.removeClass('active');
					}
				}
				$.ajax(contentPost);
			}
			
		}
	}

});

var vtex_status = {
	invoiced: "|invoiced|payment-approved|approve-payment|",
	pending: "|pending|",
	canceled: "|canceled|cancel|"
};

var filter_orders = function() {

	if(typeof orders_data == "undefined" || $.isEmptyObject(orders_data)) return false;

	var found = false;

	$(".myorders .loading-orders").stop(true, true).fadeIn(100);
	$(".myorders .orders .no-filter-orders").stop(true, true).fadeOut(100);

	$(".myorders .orders .order .content").slideUp(300, function() {
		$(this).parents(".order").removeClass("active");
	});

	var filter_text = $(".myorders .wrap-search input").data("value");
	var filter_date = $(".myorders .filters .selector.filter-date").data("value");

	if (typeof filter_date != "undefined" && filter_date != "" && filter_date != "all") {
		var date = new Date();
		switch (filter_date) {
			case "lastweek":
				date.setDate(date.getDate() - 7);
				break;
			case "lastmonth":
				date.setMonth(date.getMonth() - 1);
				break;
			case "lastyear":
				date.setFullYear(date.getFullYear() - 1);
				break;
			default:
				filter_date = false;
				break;
		}
	} else filter_date = false;

	var filter_status = $(".myorders .filters .selector.filter-status").data("value");

	$.each(orders_data, function(i, order) {

		var match = true;
		if (typeof filter_text != "undefined" && filter_text != "") {

			match = !!order.sequence.match(filter_text) || !!order.id.match(filter_text);

			if (typeof order.products != "undefined" && !match) {
				filter_text = filter_text.toLowerCase();

				var j = 0,
					len = order.products.length;

				while (!match && j < len) {
					var n = order.products[j].toLowerCase();

					match = n.indexOf(filter_text) >= 0;

					if (!match && typeof order.products_code[j] != "undefined") {
						n = order.products_code[j].toLowerCase();
						match = n.indexOf(filter_text) >= 0;
					}

					j++;
				}
			}

		}

		if (match && filter_date) {
			if (order.date < date) match = false;
		}

		if (match && typeof filter_status != "undefined" && filter_status != "" && filter_status != "all") {

			if (typeof vtex_status[filter_status] != "undefined" && vtex_status[filter_status].indexOf("|" + order.status + "|") == -1) match = false;
		}

		if (match) {
			found = true;
			$(".myorders .orders .order-" + order.sequence).stop(true, true).fadeIn(100);
		} else $(".myorders .orders .order-" + order.sequence).stop(true, true).fadeOut(100);

	});

	$(".myorders .loading-orders").fadeOut(100);

	found ? $(".myorders .orders .no-filter-orders").stop(true, true).fadeOut(100) : $(".myorders .orders .no-filter-orders").stop(true, true).fadeIn(100);

};
