/**
 * @file Imagecrop plugin. Apply crop and resize to the images in CKEditor
 *		 Version 1.5.3
 * Copyright (C) 2014-2016 Uritec SL
 *
 */
  /* global CKEDITOR, imageCrop */

(function() {
	'use strict';

	function fixGrabbersFirefox( editor ) {
		var editable = editor.editable().$;
		editable.contentEditable = false;
		editable.contentEditable = true;
	}

	CKEDITOR.plugins.add( 'imagecrop', {
		requires : [ 'dialog', 'simpleuploads' ],

		// Translations
		lang : 'en,de,es,fr',
		icons: 'imagecrop', // %REMOVE_LINE_CORE%

		init : function( editor ) {
			var icon = this.path + 'icons/imagecrop.png',
				lang = editor.lang.imagecrop;

			if (!editor.config.imagecrop)
				editor.config.imagecrop = {};

			var command = new CKEDITOR.dialogCommand( 'ImageCrop', {
				requiredContent : 'img[src]'
			} );
			// Fix to remove selecting boxes in Firefox (annoying in inline mode)
			if (CKEDITOR.env.gecko && editor.elementMode == CKEDITOR.ELEMENT_MODE_INLINE) {
				command.exec = CKEDITOR.tools.override( command.exec, function( original ) {

					return function( editor ) {
						fixGrabbersFirefox(editor);

						original.call( this, editor );
					};

				});
			}

			command.contextSensitive = true;
			command.refresh = function( editor /*, path*/ ) {
			//var firstBlock = path.block || path.blockLimit;
				var img = getSelectedImage( editor );
				if ( !img ) {
					this.setState( CKEDITOR.TRISTATE_DISABLED );
					return;
				}
				this.setState( CKEDITOR.TRISTATE_OFF );
			};

			editor.addCommand( 'ImageCrop', command );

			editor.ui.addButton( 'ImageCrop',
				{
					label : lang.menu,
					command : 'ImageCrop',
					icon : icon,	// %REMOVE_LINE_CORE%
					toolbar: 'insert,10'
				} );


			CKEDITOR.dialog.add( 'ImageCrop', this.path + 'dialogs/cropdialog.js' );

			// Check for pasted images:
			editor.on( 'simpleuploads.localImageReady', function checkImageCrop(ev) {
				var data = ev.data,
					editor = ev.editor;

				// Don't use it in the imagesfromword dialog:
				if (data.context && data.context.data && data.context.data.dialog && data.context.data.dialog._.name == 'imagesfromword') {
					return;
				}

				ev.cancel();
				ev.stop();

				// If the user drops or select several images we must show them to the user one by one
				CKEDITOR.plugins.imagecrop.addImage(editor, data);
			});


			// If the 'menu' plugin is loaded, register the menu items.
			if ( editor.addMenuItems ) {
				editor.addMenuItems(
					{
						imagecrop :
						{
							label : lang.menu,
							command : 'ImageCrop',
							icon : icon,	// %REMOVE_LINE_CORE%
							group : 'image',
							order : 11
						}
					});
			}

			// If the 'contextmenu' plugin is loaded, register the listeners.
			if ( editor.contextMenu ) {
				// check the image
				editor.contextMenu.addListener( function( element/*, selection*/ ) {
					var img = getSelectedImage( editor, element );
					if ( !img )
						return null;

					if (!editor.config.imagecrop.skipCORScheck && !CKEDITOR.plugins.imagecrop.testCORS(img.$)) {
						return null;
					}
					// And say that this context menu item must be shown
					return { imagecrop : CKEDITOR.TRISTATE_OFF  };
				});
			}
			/*
			// Check if element is really an image, discarding fake elements, and taking into account the 'enhanced image' widget
			var getImage = function( element ) {
				if (editor.widgets) {
					var widget = editor.widgets.focused;

					// hardcoded image2
					if (widget && widget.name == 'image' ) {
						var el = widget.element;
						if (!el)
							return null;

						if (el.getName() == 'img')
							return el;

						var children = el.getElementsByTag('img');
						if (children.count() == 1)
							return children.getItem(0);

						return null; // failed!!!
					}
				}

				if (!element || !element.is( 'img' ) || (element.data && element.data( 'cke-realelement' )) || element.isReadOnly() )// eslint-disable-line no-extra-parens
					return null;

				return element;
			};
			*/

		} //Init
	} );

	var processingQueue = [];
	CKEDITOR.plugins.imagecrop = {

		addImage: function(editor, data) {
			// Store it as the last item in the queue
			processingQueue.push( { editor: editor, data:data } );

			// If it's the only one, process it now.
			if (processingQueue.length == 1)
				CKEDITOR.plugins.imagecrop.processNextImage();

		},

		processNextImage: function() {
			var o = processingQueue[0],
				editor = o.editor,
				config = editor.config.imagecrop;

			if (config && config.cropsizes && config.cropsizes.length == 1 && config.cropsizes[0].automatic) {
				if (typeof window.jQuery == 'undefined') {
					CKEDITOR.scriptLoader.load( 'http://code.jquery.com/jquery-2.1.1.min.js', CKEDITOR.plugins.imagecrop.processNextImage);
					return;
				}
				var plugin = editor.plugins.imagecrop;
				var pending = false;
				if (typeof window.imageCrop == 'undefined') {
					CKEDITOR.scriptLoader.load( plugin.path + 'dialogs/imagecrop.js', CKEDITOR.plugins.imagecrop.processNextImage);
					pending = true;
				}
				if (typeof window.pica == 'undefined') {
					CKEDITOR.scriptLoader.load( plugin.path + 'dialogs/pica.min.js', CKEDITOR.plugins.imagecrop.processNextImage);
					pending = true;
				}
				if (pending)
					return;

				if (o.resizing)
					return;
				o.resizing = true;

				var cropConfig = config.cropsizes[0];
				var data = o.data;

				var img = data.image;
				var name = data.name;

				imageCrop.ResizeImage(img, cropConfig.width, cropConfig.height, name, function(file, name) {
					if (file) {
						data.file = file;
						data.name = name;
					}

					CKEDITOR.plugins.simpleuploads.insertProcessedFile(editor, data);
					CKEDITOR.plugins.imagecrop.finishedImage();
				});

				return;
			}

			editor.openDialog('ImageCrop', function(dialog) {
				dialog.srcData = o.data;
			} );
		},

		finishedImage: function() {
			// remove the oldest one from the queue
			processingQueue.shift();

			// if there's something pending, process it now.
			if (processingQueue.length > 0)
				window.setTimeout( CKEDITOR.plugins.imagecrop.processNextImage , 0);
		},



		// Tests if we can use the provided img in the canvas or whether it requieres a CORS request
		testCORS: function(img) {
			// Copy just 1 pixel and check if we can read it
			var canvas = document.createElement('canvas');
			canvas.width = 1;
			canvas.height = 1;
			var context = canvas.getContext('2d');
			context.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
			try {
				// if it's cross domain this will throw an exception
				context.getImageData(0, 0, 1, 1);
			} catch (ex) {
				return false;
			}

			return true;
		}
	};

	// Check if element is really an image, discarding fake elements, and taking into account the 'enhanced image' widget
	function getSelectedImage( editor, element ) {
		if ( !element ) {
			var sel = editor.getSelection();
			element = sel.getSelectedElement();
		}

		if ( element && element.is( 'img' ) && !element.data( 'cke-realelement' ) && !element.isReadOnly() )
			return element;

		if (editor.widgets) {
			var widget = editor.widgets.focused;
			// enhanced image
			if (widget && widget.name == 'image' ) {
				var el = widget.element;
				if (!el)
					return null;

				if (el.getName() == 'img')
					return el;

				var children = el.getElementsByTag('img');
				if (children.count() == 1)
					return children.getItem(0);

				return null; // failed!!!
			}
		}
	}
})();