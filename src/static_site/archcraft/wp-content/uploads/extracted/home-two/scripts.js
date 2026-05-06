/* --- block 1 --- */
/* <![CDATA[ */
var _wpUtilSettings = {"ajax":{"url":"/archcraft/wp-admin/admin-ajax.php"}};
//# sourceURL=wp-util-js-extra
/* ]]> */

/* --- block 2 --- */
jQuery(function($) {
 if (typeof wc_add_to_cart_params === 'undefined') {
 return false;
 }
 $(document.body).on('added_to_cart', function(event, fragments, cart_hash, $button) {
 // Check if Buy Now button was clicked
 if ($button.hasClass('single_buy_it_now_button') || $button.data('buy-now') == '1') {
 // Redirect to checkout
 var checkoutUrl = '/checkout/';
 window.location.href = checkoutUrl;
 return;
 }
 var $pid = $button.data('product_id');
 $.ajax({
 type: 'POST',
 url: wc_add_to_cart_params.ajax_url,
 data: {
 'action': 'item_added',
 'id': $pid,
 'nonce': main_data.nonce
 },
 success: function(response) {
 $('#pxl-cart-sidebar').addClass('active');
 $("body").addClass('body-overflow');
 if (fragments && fragments['span.pxl_cart_counter']) {
 $('.pxl_cart_counter').html($(fragments['span.pxl_cart_counter']).html());
 }
 $("#pxl-cart-sidebar .pxl-item--close").on('click', function() {
 $('body').removeClass('body-overflow');
 $('#pxl-cart-sidebar').removeClass('active');
 });
 }
 });
 });
 });

/* --- block 3 --- */
const lazyloadRunObserver = () => {
 const lazyloadBackgrounds = document.querySelectorAll( `.e-con.e-parent:not(.e-lazyloaded)` );
 const lazyloadBackgroundObserver = new IntersectionObserver( ( entries ) => {
 entries.forEach( ( entry ) => {
 if ( entry.isIntersecting ) {
 let lazyloadBackground = entry.target;
 if( lazyloadBackground ) {
 lazyloadBackground.classList.add( 'e-lazyloaded' );
 }
 lazyloadBackgroundObserver.unobserve( entry.target );
 }
 });
 }, { rootMargin: '200px 0px 200px 0px' } );
 lazyloadBackgrounds.forEach( ( lazyloadBackground ) => {
 lazyloadBackgroundObserver.observe( lazyloadBackground );
 } );
 };
 const events = [
 'DOMContentLoaded',
 'elementor/lazyload/observe',
 ];
 events.forEach( ( event ) => {
 document.addEventListener( event, lazyloadRunObserver );
 } );

/* --- block 4 --- */
(function () {
 var c = document.body.className;
 c = c.replace(/woocommerce-no-js/, 'woocommerce-js');
 document.body.className = c;
 })();

/* --- block 5 --- */
/* <![CDATA[ */
wp.i18n.setLocaleData( { 'text direction\u0004ltr': [ 'ltr' ] } );
//# sourceURL=wp-i18n-js-after
/* ]]> */

/* --- block 6 --- */
/* <![CDATA[ */
var elementorFrontendConfig = {"environmentMode":{"edit":false,"wpPreview":false,"isScriptDebug":false},"i18n":{"shareOnFacebook":"Share on Facebook","shareOnTwitter":"Share on Twitter","pinIt":"Pin it","download":"Download","downloadImage":"Download image","fullscreen":"Fullscreen","zoom":"Zoom","share":"Share","playVideo":"Play Video","previous":"Previous","next":"Next","close":"Close","a11yCarouselPrevSlideMessage":"Previous slide","a11yCarouselNextSlideMessage":"Next slide","a11yCarouselFirstSlideMessage":"This is the first slide","a11yCarouselLastSlideMessage":"This is the last slide","a11yCarouselPaginationBulletMessage":"Go to slide"},"is_rtl":false,"breakpoints":{"xs":0,"sm":480,"md":768,"lg":1025,"xl":1440,"xxl":1600},"responsive":{"breakpoints":{"mobile":{"label":"Mobile Portrait","value":767,"default_value":767,"direction":"max","is_enabled":true},"mobile_extra":{"label":"Mobile Landscape","value":880,"default_value":880,"direction":"max","is_enabled":true},"tablet":{"label":"Tablet Portrait","value":1024,"default_value":1024,"direction":"max","is_enabled":true},"tablet_extra":{"label":"Tablet Landscape","value":1200,"default_value":1200,"direction":"max","is_enabled":true},"laptop":{"label":"Laptop","value":1366,"default_value":1366,"direction":"max","is_enabled":true},"widescreen":{"label":"Widescreen","value":2400,"default_value":2400,"direction":"min","is_enabled":false}},"hasCustomBreakpoints":true},"version":"3.35.9","is_static":false,"experimentalFeatures":{"additional_custom_breakpoints":true,"container":true,"e_optimized_markup":true,"e_pro_free_trial_popup":true,"nested-elements":true,"home_screen":true,"global_classes_should_enforce_capabilities":true,"e_variables":true,"cloud-library":true,"e_opt_in_v4_page":true,"e_components":true,"e_interactions":true,"e_editor_one":true,"import-export-customization":true},"urls":{"assets":"\/wp-content\/plugins\/elementor\/assets\/","ajaxurl":"\/wp-admin\/admin-ajax.php","uploadUrl":"\/wp-content\/uploads"},"nonces":{"floatingButtonsClickTracking":"6e1b39da05"},"swiperClass":"swiper","settings":{"page":[],"editorPreferences":[]},"kit":{"active_breakpoints":["viewport_mobile","viewport_mobile_extra","viewport_tablet","viewport_tablet_extra","viewport_laptop"],"global_image_lightbox":"yes","lightbox_enable_counter":"yes","lightbox_enable_fullscreen":"yes","lightbox_enable_zoom":"yes","lightbox_enable_share":"yes","lightbox_title_src":"title","lightbox_description_src":"description"},"post":{"id":2866,"title":"Home%20Two%20%E2%80%93%20ArchCraft","excerpt":"","featuredImage":false}};
//# sourceURL=elementor-frontend-js-before
/* ]]> */

/* --- block 7 --- */
/* <![CDATA[ */
var main_data = {"ajax_url":"/wp-admin/admin-ajax.php"};
//# sourceURL=pxl-post-grid-js-extra
/* ]]> */

/* --- block 8 --- */
/* <![CDATA[ */
var main_data = {"ajax_url":"/wp-admin/admin-ajax.php","nonce":"a0820874f6"};
//# sourceURL=pxl-main-js-extra
/* ]]> */
