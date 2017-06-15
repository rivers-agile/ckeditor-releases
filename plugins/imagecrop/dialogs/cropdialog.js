/* eslint-env jquery */
/* global imageCrop, CKEDITOR */

(function() {
	'use strict';

	CKEDITOR.dialog.add( 'ImageCrop', function( editor ) {
		var lang = editor.lang.imagecrop,
			dialogReady = false,
			theDialog;
		var theDiv;
		var img_obj;

		loadJcrop();

		function loadJcrop() {
			// Verify that jQuery is loaded
			if (typeof window.jQuery == 'undefined') {
				CKEDITOR.scriptLoader.load( 'https://code.jquery.com/jquery-2.1.1.min.js', loadJcrop);
				return;
			}

			// Check that the version isn't too old. At least 1.7. Be careful about 1.11, 1.12...
			var version = parseFloat(window.jQuery.fn.jquery);
			if ( version < 2 && parseFloat( version ).toString().substring(2) < 7 ) {
				CKEDITOR.scriptLoader.load( 'https://code.jquery.com/jquery-2.1.1.min.js', loadJcrop);
				return;
			}

			var plugin = editor.plugins.imagecrop,
				loadCss; // As long as all the js files hasn't been merged and preloaded, it should be able to detect if it requires the dialog css.

			if (typeof jQuery.Jcrop == 'undefined') {
				CKEDITOR.scriptLoader.load( plugin.path + 'dialogs/jquery.jcrop.js', show);
				loadCss = true;
			} else {
				if (jQuery.Jcrop.oldVersion)
					return;

				// If Jcrop was already loaded, try to test if it's an older version that leaves the image hidden upon calling destroy
				// if imageCrop is loaded asume that it's our Jcrop so it's OK
				if (typeof window.imageCrop == 'undefined') {
					// create an instance of jcrop then destroy and check if the image is hidden or not
					var $div = jQuery('<div style="width:100px;height:100px"><img src="' + CKEDITOR.tools.transparentImageData + '" width="100" height="100"></div>');
					var $img = jQuery($div[0].firstElementChild);
					$img.Jcrop({}, function() {
						// let's destroy it now:
						this.destroy();

						if ($img.css('visibility') == 'hidden') {
							jQuery.Jcrop.oldVersion = true;
							if (theDialog) {
								alert('Error: The page is using an old version of Jcrop that hides the image when going back. Please update it');
								theDialog.hide();
								theDialog = null;
							}
						}
					});
				}
			}

			if (typeof window.imageCrop == 'undefined') {
				CKEDITOR.scriptLoader.load( plugin.path + 'dialogs/imagecrop.js', show);
				loadCss = true;
			}
			if (typeof window.pica == 'undefined') {
				CKEDITOR.scriptLoader.load( plugin.path + 'dialogs/pica.min.js', show);
				loadCss = true;
			}
			if (loadCss) {
				CKEDITOR.document.appendStyleSheet( plugin.path + 'dialogs/imagecrop.css' );
			}
		}

		function show() {
			img_obj = null;
			if (!theDialog || !dialogReady)
				return;

			if (typeof window.jQuery == 'undefined')
				return;

			if (typeof jQuery.Jcrop == 'undefined')
				return;

			if (jQuery.Jcrop.oldVersion) {
				alert('Error: The page is using an old version of Jcrop that hides the image when going back. Please update it');
				theDialog.hide();
				return;
			}

			if (typeof window.imageCrop == 'undefined')
				return;

			if (typeof window.pica == 'undefined')
				return;

			var o = theDialog.getContentElement( 'info', 'CropContainer' );
			theDiv = o.getElement().$;

			// a single object with all the configuration options to make it easier to upgrade and extend it
			var config = editor.config.imagecrop || {};

			// Backward compatibility
			if (editor.config.imagecrop_cropsizes)
				config.cropsizes = editor.config.imagecrop_cropsizes;

			if (editor.config.imagecrop_formats)
				config.formats = editor.config.imagecrop_formats;

			// copy to reuse existing common entries
			lang.width = editor.lang.common.width;
			lang.height = editor.lang.common.height;

			imageCrop.onCropClick = function() {
				theDialog.fire('ok', {});
				theDialog.hide();
			};

			var img, name;
			if (theDialog.srcData) {
				img = theDialog.srcData.image;
				name = theDialog.srcData.name;
			} else {
				img_obj = editor.getSelection().getSelectedElement();
				if ( !img_obj || !img_obj.is('img') ) {
					if (editor.widgets) {
						var widget = editor.widgets.focused;
						// hardcoded image2
						if (widget && (widget.name == 'image2' || widget.name == 'image') ) {
							var el = widget.element;
							if (el) {
								if (el.getName() == 'img')
									img_obj = el;
								else {
									var children = el.getElementsByTag('img');
									if (children.count() == 1)
										img_obj = children.getItem(0);
								}
							}
						}

					}
				}

				// On rare situations it's possible to launch the dialog without an image selected
				// -> in IE select an image, click outside the editor and the button will remain enabled,
				//		but img_obj will be null
				if ( !img_obj || !img_obj.is('img') ) {
					alert( lang.msgImageNotSelected );
					theDialog.hide();
					return;
				}
				/*
				var src = img_obj.data ? img_obj.data('cke-saved-src') : img_obj.getAttribute('_cke_saved_src');

				if (!src)
					src = img_obj.$.src;
				*/
				img = img_obj.$;
				name = img.src.match(/\/([^\/]*)$/)[1];

				if (!CKEDITOR.plugins.imagecrop.testCORS(img)) {
					// Reload the image with a new CORS request
					loadAsCORS(theDiv, img.src, name, config);
					return;
				}
			}

			imageCrop.showUI(theDiv, img, name, theDialog.srcData && theDialog.srcData.file, editor.id, lang, config);

			RefreshSize();
		}


		function loadAsCORS(theDiv, src, name, config) {

			var img = new Image;
			img.crossOrigin = 'Anonymous';

			img.onload = function() {
				// testing just in case, although it should be OK now
				if (!CKEDITOR.plugins.imagecrop.testCORS(img)) {
					alert('The image can\'t be edited because it is in another domain without CORS authorization.');
					theDialog.hide();
					return;
				}
				// OK, use the CORS enabled image
				imageCrop.showUI(theDiv, img, name, theDialog.srcData && theDialog.srcData.file, editor.id, lang, config);
				RefreshSize();
			};
			// If the image can't be loaded as CORS it will fail
			img.onerror = function() {
				alert('The image can\'t be edited because it is in another domain without CORS authorization.');
				theDialog.hide();
				return;
			};
			img.src = src;

			//resets cache on src of img if it comes back undefined, using a 1x1 blank gif dataURI
			if ( img.complete || img.complete === undefined ) {
				img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
				img.src = src;
			}
		}

		function RefreshSize() {
			var contents = theDialog.parts.contents,
				table = contents.getFirst().getFirst(),
				picContainer = theDiv.querySelector('.imagecrop-viewer');

			picContainer.style.width = parseInt(contents.$.style.width, 10) - (200 + table.$.offsetLeft) + 'px';
			picContainer.style.height = parseInt(contents.$.style.height, 10) - table.$.offsetTop + 'px';
		}

		var width = window.innerWidth;
		var height = window.innerHeight;

		return {
			title : lang.title,
			minWidth : 400,
			minHeight : 300,
			width: Math.round( width * 0.9 ),
			height: Math.round( height * 0.9 - 70 ),
			contents :
			[
				{
					id : 'info',
					label : 'Imagenes',
					title : 'Imagenes',
					elements :
					[
						{
							type: 'html',
							id : 'CropContainer',
							html : '&nbsp;'
						}
					]
				}
			],
			onLoad : function() {
				theDialog = this;
				theDialog.on('resize', RefreshSize);
			},
			onShow : function() {
				dialogReady = true;
				show();
			},
			onHide : function() {
				delete this.srcData;
				img_obj = null;

				// Notify that we have finished to check if there's something else pending
				CKEDITOR.plugins.imagecrop.finishedImage();
			},
			onOk : function() {
				imageCrop.getImage( function(file, name) {
					var data = theDialog.srcData;

					// we're editing an existing image, let's create the event data
					if (!data) {
						// the user hasn't edited it, so let's get out.
						if (!file) {
							theDialog.hide();
							return;
						}

						data = {
							context : 'ImageCrop',
							name : name,
							callback : null,
							requiresImage : true,
							forceLink : false,
							mode : {
								type : 'selectedFile',
								i : 1,
								count : 1
							},
							image: {} // faked image just to avoid re-processing
						};
					}

					if (file) {
						data.file = file;
						data.name = name;
					} else {
						// The images pasted from the clipboard are always in png and with an automatic name based on the id.
						// Convert them to jpg
						if (data.id + '.png' == data.name) {
							var o = imageCrop.convertImage(data.image, data.name, 'jpg80');
							data.file = o.image;
							data.name = o.name;
						}
					}

					theDialog.hide();
					CKEDITOR.plugins.simpleuploads.insertProcessedFile(editor, data);

				});
				return false;
			}
		};

	});

})();