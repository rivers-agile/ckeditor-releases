/* global pica */

(function( w, $ ) {
	'use strict';

	var imageCrop = {};
	w.imageCrop = imageCrop;

	var escala,
		FichAncho,
		FichAlto,
		jcrop_api,
		recorteDeseado,
		recorteActivo;
	var escalaEdicion;
	var $div, $laImagen;
	var IdPrefix;
	var lang;
	var originalName;
	var config;
	var initialImageCanvas;

	function initImageCrop() {
		if (jcrop_api) {
			jcrop_api.destroy();
			jcrop_api = null;
		}
		recorteDeseado = null;
		recorteActivo = null;

		if ($div.data('imagecrop-ready'))
			return;

		$div.data('imagecrop-ready', true);

		createUI($div[0]);

		// manejadores de eventos: (solo una vez)

		$div.keydown(keyDownDocument);
		$div.find('.zoomin').click(alejarZoom);
		$div.find('.zoomout').click(acercarZoom);

		$('#' + IdPrefix + '_TargetWidth').on('input', cambioDimensiones);
		$('#' + IdPrefix + '_TargetHeight').on('input', cambioDimensiones);

		$('#' + IdPrefix + '_TargetWidth').attr('min', 1);
		$('#' + IdPrefix + '_TargetHeight').attr('min', 1);

		$('#' + IdPrefix + '_LockedRatio').on('change', updateDesiredRatio);

		// Select cropping size
		$div.find('.tamanos a').click(function(ev) {
			ev.preventDefault();
			var $this = $(this);

			if ($this.hasClass('imagecrop-selectedsize'))
				return;
			$this.addClass('imagecrop-selectedsize');
			$div.find('.tamanos').addClass('YaElegido');

			var width = $this.data('width'),
				height = $this.data('height');

			/*
			if ((width && width > FichAncho) && (height && height > FichAlto) ) {
				//alert( lang.imageTooSmall.replace('{0}', width).replace('{1}', height) );
				return;
			}
			*/
			if (jcrop_api) {
				jcrop_api.destroy();
				jcrop_api = null;
			}

			$div.find('.acciones').show();

			// If not set, initialize with 10% of image dimensions
			if (!width)
				width = Math.round( FichAncho / 10 );
			if (!height)
				height = Math.round( FichAlto / 10 );

			$('#' + IdPrefix + '_TargetWidth').attr('max', FichAncho);
			$('#' + IdPrefix + '_TargetHeight').attr('max', FichAlto);

			$('#' + IdPrefix + '_TargetWidth').val(width);
			$('#' + IdPrefix + '_TargetHeight').val(height);

			// If the image dimensions match exactly the desired ones, jump ahead
			if (FichAncho == width && FichAlto == height) {
				recorteDeseado = {
					width: width,
					height: height
				};
				$div.find('.imagecrop-crop-next').click();
				return;
			}

			cambioDimensiones();
		});

		$div.find('.tamanos a').hover(function() {
			// mouse over size selector buttons
			if ($(this).hasClass('imagecrop-selectedsize'))
				return;

			var width = $(this).data('width'),
				height = $(this).data('height');

			$laImagen.Jcrop({
				trueSize: [ FichAncho, FichAlto ],
				aspectRatio: width / height,
				minSize: [ width, height ],
				setSelect: [ 0, 0, 50, 50 ],
				bgColor: 'transparent',
				allowSelect: false, // evitar que se libere la selección
				allowResize: false // para demo de cómo se verá
			}, function() {
				jcrop_api = this;
				jcrop_api.animateTo([ 0, 0, width || 50, height || 50 ]);
			});

		},function() {
			// mouse out
			if ($(this).hasClass('imagecrop-selectedsize'))
				return;

			jcrop_api.destroy();
			jcrop_api = null;
		});

		// cancel cropping
		$div.find('.imagecrop-crop-back').click(function() {
			$('#' + IdPrefix + '_fldTargetImage div.instruccion').hide();

			$('#' + IdPrefix + '_fldTargetImage p.instruccion').show();
			$('#' + IdPrefix + '_fldTargetImage .tDatos').show();
			$('#' + IdPrefix + '_fldTargetImage .imagecrop-crop-next').show();

			var $imagePreview = $div.find('.imagePreview');
			$imagePreview.removeClass('requiresEnlarge');

			if (jcrop_api)
				jcrop_api.destroy();
			jcrop_api = null;

			$div.find('.acciones').hide();
			recorteDeseado = null;
			recorteActivo = null;

			$div.find('.imagePreview').data( 'size', {
				width: FichAncho,
				height: FichAlto
			} ).width( escala * FichAncho + 'px').height( escala * FichAlto + 'px');

			$('.imagecrop-selectedsize').removeClass('imagecrop-selectedsize');
			$div.find('.tamanos').removeClass('YaElegido');
			changeEnlargeVisibility();

			return false;
		});

		// select the crop area
		$div.find('.imagecrop-crop-next').click(function(ev) {
			ev.preventDefault();

			if (jcrop_api) {
				recorteActivo = jcrop_api.tellSelect();
				if (!recorteActivo.w) {
					alert( lang.mustSelectCrop );
					return;
				}
				jcrop_api.destroy();
				jcrop_api = null;
			} else {
				// full image
				recorteActivo = {
					x: 0,
					y: 0,
					w: recorteDeseado.width,
					h: recorteDeseado.height,
					x2: recorteDeseado.width,
					y2: recorteDeseado.height
				};
			}

			$('#' + IdPrefix + '_fldTargetImage div.instruccion').hide();
			$('#' + IdPrefix + '_fldTargetImage p.instruccion').show();
			$('#' + IdPrefix + '_fldTargetImage .tDatos').show();
			$('#' + IdPrefix + '_fldTargetImage .imagecrop-crop-next').show();

			escalaEdicion = escala;

			//$div.find('.acciones table')[(recorteDeseado.width>0 && recorteDeseado.height>0) ? 'show' : 'hide']();

			var width = recorteDeseado.width || Math.round(recorteActivo.w);
			var height = recorteDeseado.height || Math.round(recorteActivo.h);
			if (width > FichAncho)
				width = FichAncho;
			if (height > FichAlto)
				height = FichAlto;

			changeZoom( OptimalZoom(width, height) );

			$('#' + IdPrefix + '_nuevoAncho').text(width + 'px');
			$('#' + IdPrefix + '_nuevoAlto').text(height + 'px');

			//  Apply crop&resize only once and then reuse it for the different toDataURL options
			CropAndResize($laImagen[0], recorteActivo, width, height, function(resizedCanvas) {
				$div.find('.trans').show();
				tmpCanvas = resizedCanvas;

				CargarPreview();
			});
			changeEnlargeVisibility();
		});

		// Volver atrás a recortar
		$div.find('.imagecrop-backtocrop').click(function(/*ev*/) {
			$div.find('.acciones').show();
			$div.find('.trans').hide();

			$div.find('.imagePreview').show();
			$div.find('.previsualizaciones').hide().html('');
			tmpCanvas = null;
			$('#' + IdPrefix + '_tamPreview span').hide().text('');

			changeZoom(escalaEdicion);

			// If the image dimensions match exactly the desired ones, jump extra step back
			var width = $('#' + IdPrefix + '_TargetWidth').val();
			var height = $('#' + IdPrefix + '_TargetHeight').val();

			if (FichAncho == width && FichAlto == height) {
				$div.find('.imagecrop-crop-back').click();
				return false;
			}

			iniciarCrop();
			return false;
		});

		// save
		$div.find('.imagecrop-save').click(function(/*ev*/) {
			imageCrop.onCropClick();
			return false;
		});


		// Create enlage table matrix
		var cells = $div.find('.imagecrop-resizematrix td');
		cells.each( function( idx, cell ) {
			var span = document.createElement('span');
			span.addEventListener('click', function() {
				setEnlargeActiveCenter( idx + 1 );
			}, false);
			cell.appendChild( span );
		});


		$('#' + IdPrefix + '_trEnlarge').hide();
		$div.find('.imagecrop-enlargebutton').click(function(/*ev*/) {
			if (jcrop_api) {
				recorteActivo = jcrop_api.tellSelect();

				jcrop_api.destroy();
				jcrop_api = null;
			}

			$('#' + IdPrefix + '_fldTargetImage').hide();
			$('#' + IdPrefix + '_trEnlarge').hide();
			$('#' + IdPrefix + '_fldEnlarge').show();

			var td = $('#' + IdPrefix + '_tdColorSelectors');
			createColorSelectors(td);

			$div.find('.imagePreview').hide();
			var $ePreview = $div.find('.enlargePreview').show();
			$ePreview.find('img').attr('src', $laImagen.attr('src'));
			adjustEnlargeBgColor();

			// Compute new suggested size
			var $button = $('.imagecrop-selectedsize');
			var width = parseInt($button.data('width'), 10) || FichAncho,
				height = parseInt($button.data('height'), 10) || FichAlto;

			var ideal = computeMinimumIdealDimensions(FichAncho, FichAlto, width, height);

			var $width = $('#' + IdPrefix + '_enlargeWidth');
			$width.val(ideal.w);
			$width.attr('min', FichAncho);

			var $height = $('#' + IdPrefix + '_enlargeHeight');
			$height.val(ideal.h);
			$height.attr('min', FichAlto);

			setEnlargeActiveCenter( localStorage[ 'imagecrop-enlargecenter' ] || 5 );
			return false;
		});

		$div.find('.imagecrop-enlarge-back').click(function(/*ev*/) {
			currentEnlargeCenter = null;

			$('#' + IdPrefix + '_fldTargetImage').show();
			$('#' + IdPrefix + '_trEnlarge').show();
			$('#' + IdPrefix + '_fldEnlarge').hide();

			$div.find('.imagePreview').show();
			$div.find('.enlargePreview').hide();

			var $targetWidth = $('#' + IdPrefix + '_TargetWidth');
			var $targetHeight = $('#' + IdPrefix + '_TargetHeight');
			var width = parseInt($targetWidth.val(), 10);
			var height = parseInt($targetHeight.val(), 10);
			beforeIniciarCrop(width, height, false);
			return false;
		});

		$div.find('.imagecrop-enlarge-next').click(function(/*ev*/) {
			enlargeImage();
			changeZoom( OptimalZoom(FichAncho, FichAlto) );

			currentEnlargeCenter = null;

			$('#' + IdPrefix + '_fldTargetImage').show();
			$('#' + IdPrefix + '_trEnlarge').show();
			$('#' + IdPrefix + '_fldEnlarge').hide();

			$div.find('.imagePreview').show();
			$div.find('.enlargePreview').hide();

			recorteDeseado = null;
			recorteActivo = null;

			// let's re-init the crop based on the button that was clicked but with the new image
			var $button = $div.find('.imagecrop-selectedsize');
			$button.removeClass('imagecrop-selectedsize');
			$button.click();

			return false;
		});

		$('#' + IdPrefix + '_enlargeWidth').on('change', adjustEnlargeSize);
		$('#' + IdPrefix + '_enlargeHeight').on('change', adjustEnlargeSize);

		/*
		function browserSupportsColorInput() {
			var colorInput = $('<input type="color" value="!" />')[0];
			return colorInput.type === 'color' && colorInput.value !== '!';
		}
		*/
		// We use the input type=color to provide a paletted color picker, but its sizing is different
		// across browsers and it doesn't support alpha, so we use a span to preview it
		var $colorInput = $('#' + IdPrefix + '_enlargeBgColor');
		$colorInput.on('change', function() {
			var color = this.value.toLowerCase();
			if (addBackgroundColor(color)) {
				var $container = $('#' + IdPrefix + '_tdColorSelectors>span:first-child');
				addBackgroundColorButton(color, $container);
			}
			setEnlargeBgColor(color);
			//adjustEnlargeBgColor();
		});
		var $previewSpan = $('#' + IdPrefix + '_enlargeBgColorPreview');
		$previewSpan.click( function() {
			$colorInput.click();
		});

		$colorInput.addClass('nativeColorInput');
		// fixme: this is useless now
		/*
		if (browserSupportsColorInput) {
			$colorInput.addClass('nativeColorInput');
		} else {
			$colorInput.addClass('fakeColorInput');
		}
		*/

		$('#' + IdPrefix + '_formato').change( CargarPreview );

		$('#' + IdPrefix + '_LockedRatio').change(function() {
			jcrop_api.setOptions( { really_keepAspectRatio: this.checked } );
		});

	}

	// Given two sets of dimensions: the current real ones and the desired ones, provides the minimum dimensions to fit the image perfectly
	function computeMinimumIdealDimensions(currentWidth, currentHeight, desiredWidth, desiredHeight) {
		// If the image is too small, then the desired dimesions are the ideal ones
		if (currentWidth <= desiredWidth && currentHeight <= desiredHeight) {
			return {
				w: desiredWidth,
				h: desiredHeight
			};
		}

		var desiredRatio = desiredWidth / desiredHeight,
			idealWidth = currentWidth,
			idealHeight = currentHeight;

		idealWidth = Math.max(idealWidth, Math.ceil(idealHeight * desiredRatio) );
		idealHeight = Math.max(idealHeight, Math.ceil(idealWidth / desiredRatio) );

		return {
			w: idealWidth,
			h: idealHeight
		};
	}

	var backgroundColors;
	function addBackgroundColor(color) {
		if (backgroundColors.indexOf(color) == -1) {
			backgroundColors.push(color);
			return true;
		}
		return false;
	}

	function addBackgroundColorButton(color, $container) {
		var span = $('<span class="imagecrop-bgcolorselector matrixBackground"><span style="background-color:' + color + '" title="' + color + '"></span></span>');
		span.hover( function() {
			// preview change
			$div.find('.enlargedWrapper').css('background-color', color);
		}, function() {
			// Restore
			adjustEnlargeBgColor();
		});
		span.click( function() {
			setEnlargeBgColor( color );
			//adjustEnlargeBgColor();
		});
		$container.append(span);
	}

	// Create row with possible color selectors according to the image
	function createColorSelectors(td) {
		td.empty();
		td.css('white-space', 'normal');
		var $container = $('<span>');
		$container.css('white-space', 'normal');
		td.append($container);
		backgroundColors = [];
		// Add always white and black
		addBackgroundColor('#ffffff');
		addBackgroundColor('#000000');
		// If it's a png, allow to use transparent background.
		if ( (/.png$/i).test( originalName )	)
			addBackgroundColor('rgba(0, 0, 0, 0)');

		// Detect color from the four corners
		var corners = [];
		corners.push(getColorFromImage(0, 0));
		corners.push(getColorFromImage(FichAncho - 1, 0));
		corners.push(getColorFromImage(0, FichAlto - 1));
		corners.push(getColorFromImage(FichAncho - 1, FichAlto - 1));

		var isSameColor = true;
		var initial = corners[0];
		corners.forEach( function( color ) {
			if (initial != color)
				isSameColor = false;
			addBackgroundColor(color);
		});

		// Create buttons for the colors
		backgroundColors.forEach( function( color ) {
			addBackgroundColorButton(color, $container);
		});

		if (isSameColor)
			setEnlargeBgColor(initial);
		else
			setEnlargeBgColor('#ffffff');

		var $buttonsContainer = $('#' + IdPrefix + '_backButtonsContainer');
		// Button to launch the browser color selector
		var $more = $('<span class="imagecrop-morecolors" title="'  + (lang.moreColorsTooltip || 'Elija otro color de la paleta') +  '">' + (lang.moreColors || 'Más') + '</span>');
		$more.click(function() {
			$('#' + IdPrefix + '_enlargeBgColor').click();
		});
		$buttonsContainer.append($more);

		// Color picker from the image
		var $picker = $('<span class="imagecrop-colorpicker" title="'  + (lang.colorPickerTooltip || 'Elija un color de la imagen') +  '"><svg viewBox="0 0 24 24"><path d="M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z"/></svg></span>');
		$buttonsContainer.append($picker);
		$picker.click( function(e) {
			e.stopPropagation();
			$picker[0].classList.add('pickcolor');
			var $enlarge = $div.find('.enlargedWrapper');
			$enlarge.toggleClass('pickcolor');
			var $enlargeImg = $enlarge.find('img');
			if ($enlarge.hasClass('pickcolor')) {
				$(document.body).one('click', function(e) {
					$enlarge.removeClass('pickcolor');
					$picker[0].classList.remove('pickcolor');

					$enlargeImg.off('mousemove mouseleave');
					e.stopPropagation();

					var target = e.target;
					if (target.nodeName != 'IMG')
						return;
					if (!$.contains( $enlarge[0], target))
						return;

					var rect = target.getBoundingClientRect(),
						offsetX = e.clientX - rect.left,
						offsetY = e.clientY - rect.top;

					var color = getColorFromImage( offsetX / escala, offsetY / escala);
					//console.log('%c   ', 'background: ' + color, color);
					//adjustEnlargeBgColor();
					addBackgroundColor(color);
					addBackgroundColorButton(color, $container);
					setEnlargeBgColor( color );

				});
				$enlargeImg.on('mousemove', function(e) {
					// preview change
					var target = e.target;
					var rect = target.getBoundingClientRect(),
						offsetX = e.clientX - rect.left,
						offsetY = e.clientY - rect.top;

					var color = getColorFromImage( offsetX / escala, offsetY / escala);
					//console.log('%c   ', 'background: ' + color, color)
					$enlarge.css('background-color', color);
				});
				$enlargeImg.on('mouseleave', function() {
					// Restore
					adjustEnlargeBgColor();
				});
			}
		});
	}

	function getColorFromImage(x, y) {
		if (!initialImageCanvas) {
			initialImageCanvas = document.createElement('canvas');
			initialImageCanvas.width = FichAncho;
			initialImageCanvas.height = FichAlto;
			initialImageCanvas.getContext('2d')
				.drawImage($laImagen[0], 0, 0, FichAncho, FichAlto);
		}

		var ctx = initialImageCanvas.getContext('2d'),
			pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data,
			alpha = pixel[3];
		if (alpha == 255)
			return '#' + ('000000' + rgbToHex(pixel[0], pixel[1], pixel[2])).slice(-6);

		return 'rgba(' + pixel.join(', ') + ')';
	}

	function rgbToHex(r, g, b) {
		return ((r << 16) | (g << 8) | b).toString(16).toLowerCase();
	}

	// Computes where the image should be placed according to the desired "center" for the grow operation
	function computePositionInEnlargedImage(canvasWidth, canvasHeight, centerIdx) {
		var position = {
			x: canvasWidth - FichAncho,
			y: canvasHeight - FichAlto
		};

		var centerCol = centerIdx % 3;
		var centerRow = 1 + ( centerIdx - centerCol ) / 3;
		if (centerCol == 0)
			centerCol = 3;

		switch (centerCol) {
			case 1:
				position.x = 0;
				break;
			case 2:
				position.x = position.x / 2;
				break;
		}

		switch (centerRow) {
			case 1:
				position.y = 0;
				break;
			case 2:
				position.y = position.y / 2;
				break;
		}

		return position;
	}

	// Resizes the enlargement preview and repositions the image
	function adjustEnlargeSize() {
		if (!currentEnlargeCenter)
			return;

		var $width = $('#' + IdPrefix + '_enlargeWidth');
		var $height = $('#' + IdPrefix + '_enlargeHeight');
		var width = parseInt($width.val(), 10);
		var height = parseInt($height.val(), 10);

		var $ePreviewDiv = $div.find('.enlargePreview div');
		$ePreviewDiv.data( 'size', {
			width: width,
			height: height
		});
		$ePreviewDiv.width(escala * width + 'px').height(escala * height + 'px');

		var position = computePositionInEnlargedImage(width, height, currentEnlargeCenter);
		var $img = $ePreviewDiv.find('img');
		$img.css('left', escala * position.x + 'px');
		$img.css('top', escala * position.y + 'px');
	}

	function setEnlargeBgColor(color) {
		if (color == currentEnlargeBgColor)
			return;

		currentEnlargeBgColor = color;
		$('#' + IdPrefix + '_enlargeBgColorPreview').css('background-color', color);
		//$('#' + IdPrefix + '_enlargeBgColor').val();
		adjustEnlargeBgColor();
	}

	var currentEnlargeBgColor;

	// Changes the background color of the enlargement preview
	function adjustEnlargeBgColor() {
		$div.find('.enlargedWrapper').css('background-color', currentEnlargeBgColor);
	}

	function enlargeImage() {
		var $width = $('#' + IdPrefix + '_enlargeWidth');
		var $height = $('#' + IdPrefix + '_enlargeHeight');
		var width = parseInt($width.val(), 10);
		var height = parseInt($height.val(), 10);

		var position = computePositionInEnlargedImage(width, height, currentEnlargeCenter);

		var bgColor = currentEnlargeBgColor;
		var srcImage = $laImagen[0];

		var canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d');

		canvas.width = width;
		canvas.height = height;

		ctx.fillStyle = bgColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.drawImage(srcImage, 0, 0, FichAncho, FichAlto, position.x, position.y, FichAncho, FichAlto);

		// Now use the new image
		var dataUrl = canvas.toDataURL('image/png');
		FichAncho = width;
		FichAlto = height;

		var img = $laImagen[0];
		if (!img.originalSrc) {
			// Just in case we add in the future a "revert enlarge" option
			img.originalSrc = img.src;
		}
		img.src = dataUrl;
		img.width = FichAncho;
		img.height = FichAlto;
		$laImagen.width( FichAncho + 'px').height( FichAlto + 'px');
		document.getElementById(IdPrefix + '_PrevAlto').innerHTML = FichAlto + ' px';
		document.getElementById(IdPrefix + '_PrevAncho').innerHTML = FichAncho + ' px';
	}

	var activeCenterCell;
	var currentEnlargeCenter;

	// Sets the new active center for the enlarge operation
	function setEnlargeActiveCenter(centerIdx) {
		localStorage[ 'imagecrop-enlargecenter' ] = centerIdx;
		if (activeCenterCell) {
			activeCenterCell.classList.remove('imagecrop-currentcenter');
		}
		var cells = $div.find('.imagecrop-resizematrix span');
		activeCenterCell = cells[ centerIdx - 1 ];
		activeCenterCell.classList.add('imagecrop-currentcenter');
		currentEnlargeCenter = centerIdx;
		var arrows = ' ↖↑↗← →↙↓↘';
		// fixme
		// Is it possible to calculate it automatically?
		// we'll optimize later
		/*
		var centerCol = centerIdx % 3;
		var centerRow = 1 + ( centerIdx - centerCol ) / 3;
		if (centerCol == 0)
			centerCol = 3;
		*/
		var combinations = [
			[ 5, 6, 0, 8, 9, 0, 0, 0, 0 ],
			[ 4, 5, 6, 7, 8, 9, 0, 0, 0 ],
			[ 0, 4, 5, 0, 7, 8, 0, 0, 0 ],

			[ 2, 3, 0, 5, 6, 0, 8, 9, 0 ],
			[ 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
			[ 0, 1, 2, 0, 4, 5, 0, 7, 8 ],

			[ 0, 0, 0, 2, 3, 0, 5, 6, 0 ],
			[ 0, 0, 0, 1, 2, 3, 4, 5, 6 ],
			[ 0, 0, 0, 0, 1, 2, 0, 4, 5 ]
		];
		var matrix = combinations[ centerIdx - 1 ];

		cells.each( function(idx, cell) {
			cell.textContent = arrows[ matrix[ idx ] ];
		});

		adjustEnlargeSize();
	}

	// Change the visibility of the Enlarge to desired size only when the user is selecting the crop
	function changeEnlargeVisibility() {
		var row = $('#' + IdPrefix + '_trEnlarge')[0];
		var show = jcrop_api && !config.disableEnlarge;

		if (show) {
			var $targetWidth = $('#' + IdPrefix + '_TargetWidth');
			var $targetHeight = $('#' + IdPrefix + '_TargetHeight');
			var width = parseInt($targetWidth.val(), 10);
			var height = parseInt($targetHeight.val(), 10);
			var ideal = computeMinimumIdealDimensions(FichAncho, FichAlto, width, height);
			// if the current dimensions won't be changed by enlarging, don't show the button
			if (ideal.w == FichAncho && ideal.h == FichAlto) {
				show = false;
			}
		}

		if ( show )
			row.style.display = '';
		else
			row.style.display = 'none';
	}

	function updateDesiredRatio() {
		if (!this.checked)
			return;

		var width = parseInt($('#' + IdPrefix + '_TargetWidth').val(), 10);
		var height = parseInt($('#' + IdPrefix + '_TargetHeight').val(), 10);
		desiredAspectRatio = width / height;
	}

	var desiredAspectRatio;

	// Readjust with new target size (on initial crop size selection or change of inputs)
	function cambioDimensiones(e) {
		var $targetWidth = $('#' + IdPrefix + '_TargetWidth');
		var $targetHeight = $('#' + IdPrefix + '_TargetHeight');
		var width = parseInt($targetWidth.val(), 10);
		var height = parseInt($targetHeight.val(), 10);

		if (!e) {
			$('.imagePreview').width( escala * width + 'px').height( escala * height + 'px').data( 'size', {
				width: width,
				height: height
			} );
		}

		/*
		if ((width && width > FichAncho) || (height && height > FichAlto) ) {
			// auto enlarge if it's too small
			$div.find('.imagecrop-enlargebutton').click();
			return;
		}
		*/

		var recorteTmp = { width: width, height: height };
		if (!e) {
			desiredAspectRatio = width / height;
		}

		if (recorteDeseado && recorteDeseado.width == recorteTmp.width && recorteDeseado.height == recorteTmp.height)
			return;

		// Reajustar proporción de la selección
		if (jcrop_api) {
			recorteActivo = jcrop_api.tellSelect();

			var keepRatio = document.getElementById(IdPrefix + '_LockedRatio').checked;
			if (keepRatio) {
				var ratio = desiredAspectRatio;

				// Cambia la anchura, escalar la selección:
				if (recorteDeseado.width != recorteTmp.width) {
					if (!$targetHeight.is(':focus')) {
						recorteTmp.height = recorteTmp.width / ratio;
						recorteTmp.height = Math.round( recorteTmp.height );
						if (recorteTmp.height > FichAlto)
							recorteTmp.height = FichAlto;
						$targetHeight.val(recorteTmp.height);
					}

					recorteActivo.h = recorteTmp.height * recorteActivo.h / recorteDeseado.height;
					recorteActivo.y2 = recorteActivo.y + recorteActivo.h;
					if (recorteActivo.y2 > FichAlto) {
						recorteActivo.y = FichAlto - recorteActivo.h;
					}
				}
				// Cambia la anchura, escalar la selección:
				if (recorteDeseado.height != recorteTmp.height) {
					if (!$targetWidth.is(':focus')) {
						recorteTmp.width = recorteTmp.height * ratio;
						recorteTmp.width = Math.round( recorteTmp.width );
						if (recorteTmp.width > FichAncho)
							recorteTmp.width = FichAncho;
						$targetWidth.val(recorteTmp.width);
					}

					recorteActivo.w = recorteTmp.width * recorteActivo.w / recorteDeseado.width;
					recorteActivo.x2 = recorteActivo.x + recorteActivo.w;
					if (recorteActivo.x2 > FichAncho) {
						recorteActivo.x = FichAncho - recorteActivo.w;
					}
				}
			} else {
				// Cambia la anchura, escalar la selección:
				if (recorteDeseado.width != recorteTmp.width) {
					recorteActivo.w = recorteActivo.w * recorteTmp.width / recorteDeseado.width;
					recorteActivo.x2 = recorteActivo.x + recorteActivo.w;
					if (recorteActivo.x2 > FichAncho) {
						recorteActivo.x = FichAncho - recorteActivo.w;
					}
				}
				// Cambia la anchura, escalar la selección:
				if (recorteDeseado.height != recorteTmp.height) {
					recorteActivo.h = recorteActivo.h * recorteTmp.height / recorteDeseado.height;
					recorteActivo.y2 = recorteActivo.y + recorteActivo.h;
					if (recorteActivo.y2 > FichAlto) {
						recorteActivo.y = FichAlto - recorteActivo.h;
					}
				}
			}
		}

		recorteDeseado = recorteTmp;

		var showWarnings = !config.disableEnlarge;

		beforeIniciarCrop(width, height, showWarnings);
	}

	// Adjust visibility of the crop message and controls according to the size of the image
	function beforeIniciarCrop(width, height, showWarnings) {
		var $imagePreview = $div.find('.imagePreview');
		$imagePreview.removeClass('requiresEnlarge');

		$('#' + IdPrefix + '_fldTargetImage div.instruccion').hide();

		$('#' + IdPrefix + '_fldTargetImage p.instruccion').show();
		$('#' + IdPrefix + '_fldTargetImage .tDatos').show();
		$('#' + IdPrefix + '_fldTargetImage .imagecrop-crop-next').show();
		$('#' + IdPrefix + '_trEnlarge')[0].style.display = 'none';

		var ok = true;
		var txtResize = lang.doYouWantToResize || '¿Desea ampliar el lienzo?';
		if ((width && width > FichAncho) && (height && height > FichAlto) ) {
			$imagePreview.addClass('requiresEnlarge');
			var txtTooSmall = lang.imageTooSmall.replace('{0}', width).replace('{1}', height);
			if (showWarnings && confirm( txtTooSmall + '\r\n' + txtResize)) {
				$div.find('.imagecrop-enlargebutton').click();
				return;
			}

			if (!config.disableEnlarge) {
				$('#' + IdPrefix + '_fldTargetImage div.instruccion').html(txtTooSmall + '<br><br>' + txtResize);
				$('#' + IdPrefix + '_trEnlarge')[0].style.display = '';
			} else {
				$('#' + IdPrefix + '_fldTargetImage div.instruccion').html(txtTooSmall);
			}
			$('#' + IdPrefix + '_fldTargetImage div.instruccion').show();

			$('#' + IdPrefix + '_fldTargetImage p.instruccion').hide();
			$('#' + IdPrefix + '_fldTargetImage .tDatos').hide();
			$('#' + IdPrefix + '_fldTargetImage .imagecrop-crop-next').hide();
			ok = false;

		} else {
			if (width && width > FichAncho) {
				$imagePreview.addClass('requiresEnlarge');
				$('#' + IdPrefix + '_TargetWidth').val(FichAncho);
				// alert( lang.imageTooNarrow );
				if (showWarnings && confirm( lang.imageTooNarrow + '\r\n' + txtResize)) {
					$div.find('.imagecrop-enlargebutton').click();
					return;
				}
			}
			if (height && height > FichAlto) {
				$imagePreview.addClass('requiresEnlarge');
				$('#' + IdPrefix + '_TargetHeight').val(FichAlto);
				//alert( lang.imageTooShort );
				if (showWarnings && confirm( lang.imageTooShort + '\r\n' + txtResize)) {
					$div.find('.imagecrop-enlargebutton').click();
					return;
				}
			}
		}

		if (ok)
			iniciarCrop();
	}


	function createUI(container) {
		var cropsizes = '',
			i;
		var aSizes = (config && config.cropsizes) || [ { title:'free cropping', name:'No crops defined' } ];
		for (i = 0; i < aSizes.length; i++) {
			var size = aSizes[i];
			var buttonText = size.name || i;
			if (size.width && !size.title) {
				//buttonText += '<br><span class="imagecrop-size">' + size.width + ' x ' + size.height + '</span>';
				size.title += size.width + ' x ' + size.height;
			}
			cropsizes += '<a class="cke_dialog_ui_button" href="#" data-width="' + (size.width || '') + '" data-height="' + (size.height || '') +
					'" title="' + (size.title || '') + '"><span class="cke_dialog_ui_button">' + buttonText + '</span></a>';
		}

		var formats = '';
		var aFormats = (config && config.formats) || [
			{ title:'JPG - Low Quality', value:'jpg75' },
			{ title:'JPG - Normal Quality', value:'jpg80', attributes:'selected' },
			{ title:'JPG - High Quality', value:'jpg90' },
			{ title:'PNG (for texts)', value:'png' }
		];
		for (i = 0; i < aFormats.length; i++) {
			var format = aFormats[i];
			formats += '<option value="' + format.value + '" ' + (format.attributes || '') +
					'>' + (format.title || format.value) + '</option>';
		}

		container.innerHTML = '<div class="imagecrop-main">' +
			'	<div class="imagecrop-sidebar">' +
			'		<p class="imagecrop-zoom">' +
			'			<span class="zoombutton zoomin" title="' + lang.zoomIn + '"></span>' +
			'			<span class="zoombutton zoomout" title="' + lang.zoomOut + '"></span>' +
			'			<span class="escala"></span>' +
			'		</p>' +
			'		<fieldset>' +
			'			<legend>' + lang.originalImage + '</legend>' +
			'			<table class="tDatos">' +
			'				<tr>' +
			'					<th>' + lang.width + '</th>' +
			'					<td id="' + IdPrefix + '_PrevAncho"></td>' +
			'				</tr>' +
			'				<tr>' +
			'					<th>' + lang.height + '</th>' +
			'					<td id="' + IdPrefix + '_PrevAlto"></td>' +
			'				</tr>' +
			'				<tr>' +
			'					<th>' + lang.fileSize + '</th>' +
			'					<td id="' + IdPrefix + '_PrevPeso"></td>' +
			'				</tr>' +
			'			</table>' +
			'		</fieldset>' +
			'		<fieldset id="' + IdPrefix + '_fldTargetImage">' +
			'			<legend>' + lang.targetImage + '</legend>' +
			'			<div class="tamanos">' +
			'				<p class="instruccion">' + lang.chooseSizeInstructions + '</p>' +
							cropsizes +
			'			</div>' +
			'			<div class="acciones" style="display: none">' +
			'				<div class="instruccion promptEnlarge"> </div>' +
			'				<div id="' + IdPrefix + '_trEnlarge" class="imagecrop-divenlargebutton" style="display:none">' +
			'						<a class="cke_dialog_ui_button imagecrop-enlargebutton" href="#"><span class="cke_dialog_ui_button">' + (lang.enlargeToFit || 'Ampliar lienzo') + '</span></a>' +
			'				</div>' +
			'				<p class="instruccion">' + lang.croppingInstructions + '</p>' +
			'				<table class="tDatos">' +
			'					<tr class="CurrentCrop">' +
			'						<td id="' + IdPrefix + '_recorteAncho"></td>' +
			'						<td class="imagecrop-multiply">x</td>' +
			'						<td id="' + IdPrefix + '_recorteAlto"></td>' +
			'						<td>px</td>' +
			'					</tr>' +
			'					<tr class="Title_TargetSize">' +
			'						<td colspan="4">' + lang.targetSize + '</td>' +
			'					</tr>' +
			'					<tr class="TargetSize">' +
			'						<td><input type="number" id="' + IdPrefix + '_TargetWidth"></td>' +
			'						<td class="imagecrop-multiply">x</td>' +
			'						<td><input type="number" id="' + IdPrefix + '_TargetHeight"></td>' +
			'						<td>px</td>' +
			'					</tr>' +
			'					<tr>' +
			'						<td class="imagecrop-labeldimensions">' + lang.width + '</td>' +
			'						<td></td>' +
			'						<td class="imagecrop-labeldimensions">' + lang.height + '</td>' +
			'						<td></td>' +
			'					</tr>' +
			'					<tr class="">' +
			'						<td colspan="4"><label title="' + (lang.keepAspectRatioTooltip || '') + '"><input type="checkbox" id="' + IdPrefix + '_LockedRatio" checked> ' + ( lang.keepAspectRatio || 'Mantener la relación ancho-alto') + '</label></td>' +
			'					</tr>' +
			'				</table>' +
			'				<a href="#" class="imagecrop-crop-back">' + lang.back + '</a>' +
			'				<a class="cke_dialog_ui_button imagecrop-crop-next" href="#"><span class="cke_dialog_ui_button">' + lang.applyCrop + '</span></a>' +
			'			</div>' +
			'			<div class="trans" style="display: none">' +
			'				<p class="instruccion">' + lang.formatInstructions + '</p>' +
			'				<label for="formato">' + lang.chooseFormat + '</label>' +
			'				<select id="' + IdPrefix + '_formato">' + formats + '</select>' +
			'				<table class="tDatos">' +
			'					<tr>' +
			'						<th>' + lang.width + '</th>' +
			'						<td id="' + IdPrefix + '_nuevoAncho"></td>' +
			'					</tr>' +
			'					<tr>' +
			'						<th>' + lang.height + '</th>' +
			'						<td id="' + IdPrefix + '_nuevoAlto"></td>' +
			'					</tr>' +
			'					<tr>' +
			'						<th>' + lang.fileSize + '</th>' +
			'						<td><p id="' + IdPrefix + '_tamPreview"></p></td>' +
			'					</tr>' +
			'				</table>' +
			'				<br><br>' +
			'				<a href="#" class="imagecrop-backtocrop">' + lang.back + '</a>' +
			'				<a class="cke_dialog_ui_button imagecrop-save" href="#"><span class="cke_dialog_ui_button">' + lang.save + '</span></a>' +
			'			</div>' +
			'		</fieldset>' +
			'		<fieldset id="' + IdPrefix + '_fldEnlarge" style="display:none">' +
			'			<legend>' + (lang.enlargeImage || 'Nuevo lienzo') + '</legend>' +
			'				<p class="instruccion">' + (lang.enlargeInstructions || 'Elija cómo ha de ampliarse la imagen.') + '</p>' +
			'				<table class="tDatos">' +
			'					<tr>' +
			'						<th>' + lang.width + '</th>' +
			'						<td><input type="number" id="' + IdPrefix + '_enlargeWidth">px</td>' +
			'					</tr>' +
			'					<tr>' +
			'						<th>' + lang.height + '</th>' +
			'						<td><input type="number" id="' + IdPrefix + '_enlargeHeight">px</td>' +
			'					</tr>' +
			'					<tr>' +
			'						<th style="border-right:0; border-bottom:0">' + (lang.backgroundColor || 'Color de fondo') + '</th>' +
			'						<td style="border-left:0; border-bottom:0"><span class="imagecrop-bgcolorselector matrixBackground"><span id="' + IdPrefix + '_enlargeBgColorPreview" class=""></span></span><input type="color" id="' + IdPrefix + '_enlargeBgColor"><span id="' + IdPrefix + '_backButtonsContainer"></span></td>' +
			'					</tr>' +
			'					<tr>' +
			'						<td style="border-top:0;" id="' + IdPrefix + '_tdColorSelectors" colspan="2"></td>' +
			'					</tr>' +
			'				</table>' +
			'			<table class="imagecrop-resizematrix">' +
			'				<tr>' +
			'					<td></td><td></td><td></td>' +
			'				</tr>' +
			'				<tr>' +
			'					<td></td><td></td><td></td>' +
			'				</tr>' +
			'				<tr>' +
			'					<td></td><td></td><td></td>' +
			'				</tr>' +
			'			</table>' +
			'				<br><br>' +
			'				<a href="#" class="imagecrop-enlarge-back">' + lang.back + '</a>' +
			'				<a class="cke_dialog_ui_button imagecrop-enlarge-next" href="#"><span class="cke_dialog_ui_button">' + (lang.doEnlargeImage || 'Aplicar cambios') + '</span></a>' +
			'		</fieldset>' +
			'</div>' +
			'<div class="imagecrop-viewer">' +
			'		<div class="imagePreview"><img alt=""></div>' +
			'		<div class="previsualizaciones"></div>' +
			'		<div class="enlargePreview" style="display:none"><div class="enlargedWrapperBack matrixBackground"><div class="enlargedWrapper"><img alt=""></div></div></div>' +
			'	</div>' +
			'</div>';
	}

	imageCrop.showUI = function(theDiv, srcImage, srcName, srcFile, prefix, lng, cfg) {
		IdPrefix = prefix;
		lang = lng;
		originalName = srcName;
		config = cfg;

		// Get a jQuery object
		$div = $( theDiv );

		initImageCrop();

		initialImageCanvas = null;

		$laImagen = $div.find('.imagePreview img');
		var img = $laImagen[0];
		img.style.width = '';
		img.style.height = '';

		var format = getDefaultFormat(srcName);
		$('#' + IdPrefix + '_formato').val(format);

		// Copy the CrossOrigin attribute from the source image
		// Firefox seems to have problems (in some versions) so it doesn't display the image if it's base64 and has this attribute
		if (srcImage.crossOrigin)
			img.crossOrigin = srcImage.crossOrigin;

		img.onload = function() {
			if (img.naturalWidth === 0) {
				// when replacing an image, the browser might fire the load event, but it still uses the old data
				window.setTimeout( $laImagen[0].onload, 50);
				return;
			}
			img.onload = null;
			// Leer la imagen
			FichAncho = img.naturalWidth;
			FichAlto = img.naturalHeight;
			img.width = FichAncho;
			img.height = FichAlto;
			document.getElementById(IdPrefix + '_PrevAlto').innerHTML = FichAlto + ' px';
			document.getElementById(IdPrefix + '_PrevAncho').innerHTML = FichAncho + ' px';
			$div.find('.imagePreview').data( 'size', {
				width: FichAncho,
				height: FichAlto
			} );

			window.setTimeout(function() {
				changeZoom( OptimalZoom(FichAncho, FichAlto) );
			}, 50);
		};
		img.originalSrc = srcImage.src;
		img.src = srcImage.src;

		var peso;
		// en el inicial, Chrome lo carga como Blob en vez de base64
		if (srcFile && srcFile.size)
			peso = formatearTamano(srcFile.size);
		else {
			if (srcImage.size)
				peso = formatearTamano(srcImage.size);
			else
				peso = CalcularTamanoImg(srcImage.src);
		}

		document.getElementById(IdPrefix + '_PrevPeso').innerHTML = peso;

		// resetear
		if (jcrop_api) {
			jcrop_api.destroy();
			jcrop_api = null;
		}
		$div.find('.acciones').hide();
		recorteDeseado = null;
		recorteActivo = null;

		$('.imagecrop-selectedsize').removeClass('imagecrop-selectedsize');
		$div.find('.tamanos').removeClass('YaElegido');

		$div.find('.trans').hide();
		$div.find('.imagePreview').show();
		$div.find('.previsualizaciones').html('').hide();
		tmpCanvas = null;
		$('#' + IdPrefix + '_tamPreview span').hide().text('');

		$('#' + IdPrefix + '_fldTargetImage').show();
		$('#' + IdPrefix + '_fldEnlarge').hide();
		$div.find('.enlargePreview').hide();

		changeZoom(1);
		changeEnlargeVisibility();
	};

	function crop_resize_Image(srcImage, recorte, targetWidth, targetHeight, name, callback) {
		// If not ready, delay until it works.
		if (!srcImage.naturalWidth) {
			window.setTimeout(function() {
				crop_resize_Image(srcImage, recorte, targetWidth, targetHeight, name, callback);
			}, 10);
			return;
		}

		var cropCanvas = document.createElement('canvas');
		var width = Math.round(recorte.w);
		var height = Math.round(recorte.h);
		var x = Math.round(recorte.x);
		var y = Math.round(recorte.y);
		if (x < 0) x = 0;
		if (y < 0) y = 0;
		if (width > srcImage.naturalWidth) width = srcImage.naturalWidth;
		if (height > srcImage.naturalHeight) height = srcImage.naturalHeight;

		cropCanvas.width = width;
		cropCanvas.height = height;
		cropCanvas.getContext('2d').
			drawImage(srcImage, x, y, width, height, 0, 0, width, height);

		// If the image will be only cropped without changes, then return just the cropCanvas
		if (width == targetWidth && height == targetHeight) {
			callback(cropCanvas);
			return;
		}

		var resizedCanvas = document.createElement('canvas');
		resizedCanvas.width = targetWidth;
		resizedCanvas.height = targetHeight;

		/*
		{
			quality - 0..3. Default = 3 (lanczos, win=3).
			alpha - use alpha channel. Default = false.
			unsharpAmount - 0..500. Default = 0 (off). Usually between 50 to 100 is good.
			unsharpThreshold - 0..100. Default = 0. Try 10 as starting point.
		}
		*/
		var picaOptions = { quality:3 };
		// Preserve alpha for pngs, of course then the image must be saved as png
		if (/\.png$/.test(name)) {
			picaOptions.alpha = true;
		}
		pica.resizeCanvas(cropCanvas, resizedCanvas, picaOptions, function(/*err*/) {
			callback(resizedCanvas);
		});

	}

	// Public API
	// Resize without UI
	imageCrop.ResizeImage = function(img, maxWidth, maxHeight, name, callback) {
		if (img.width == 0) {
			window.setTimeout(function() {
				imageCrop.ResizeImage(img, maxWidth, maxHeight, name, callback);
			}, 50);
			return;
		}

		var width = img.width,
			height = img.height;

		if (width <= maxWidth && height <= maxHeight) {
			// Nothing to do
			callback(null, name);
			return;
		}

		var recorte = {
			x: 0,
			y: 0,
			w: width,
			h: height
		};

		// Keep aspect ratio
		var factorX = maxWidth / width,
			factorY = maxHeight / height,
			factor = Math.min(factorX, factorY);

		width = Math.round(factor * width);
		height = Math.round(factor * height);

		crop_resize_Image(img, recorte, width, height, name, function(canvas) {
			var formato = getDefaultFormat(name);
			var sizes = '_' + width + 'x' + height;

			callback(generateDataUrl(canvas, formato, name), getNewName(name, sizes, formato));
		});
	};

	// Public API
	// Returns the currently visible image according with whatever operations are pending applied.
	imageCrop.getImage = function( callback ) {

		var formato = $('#' + IdPrefix + '_formato').val();
		var imgPreview = $('#' + IdPrefix + '_Prev_' + formato + ' img');
		var width, height, sizes = '';

		if (jcrop_api) {
			recorteActivo = jcrop_api.tellSelect();
			jcrop_api.destroy();
			jcrop_api = null;
		}

		// is the canvas being Enlargened?
		if (currentEnlargeCenter) {
			enlargeImage();
			// use all the image
			recorteActivo = {
				x: 0,
				y: 0,
				x2: FichAncho,
				y2: FichAlto,
				w: FichAncho,
				h: FichAlto
			};
		}

		if (recorteActivo) {
			width = recorteDeseado.width || Math.round(recorteActivo.w);
			height = recorteDeseado.height || Math.round(recorteActivo.h);
			sizes = '_' + width + 'x' + height;
		}

		// The preview was already created and ready to use
		if (imgPreview.length > 0) {
			callback(imgPreview[0].src, getNewName(originalName, sizes, formato));
			return;
		}

		// The user did have a selection but didn't crop it
		if (recorteActivo) {
			$div.find('.trans').hide();

			// it might be lenghty...
			CropAndResize($laImagen[0], recorteActivo, width, height, function(canvas) {
				var formato = getDefaultFormat(originalName);
				callback(generateDataUrl(canvas, formato, originalName), getNewName(originalName, sizes, formato));
			});

			return;
		}

		// Just pressed OK
		var maximums = config.maximumDimensions;
		// Check if there are maximum dimensions defined:
		if (maximums && ((maximums.width && maximums.width < FichAncho) || (maximums.height && maximums.height < FichAlto))) {
			width = FichAncho;
			height = FichAlto;
			// calculate proper dimensions to respect maximums and keep the aspect ratio:
			if (maximums.width && maximums.width < width) {
				width = maximums.width;
				height = Math.round(FichAlto * (maximums.width / FichAncho));
			}
			if (maximums.height && maximums.height < height) {
				height = maximums.height;
				width = Math.round(FichAncho * (maximums.height / FichAlto));
			}

			// just resize it
			var resizingSelection = {
				x: 0,
				y: 0,
				w: FichAncho,
				h: FichAlto
			};
			sizes = '_' + width + 'x' + height;

			CropAndResize($laImagen[0], resizingSelection, width, height, function(canvas) {
				var formato = getDefaultFormat(originalName);
				callback(generateDataUrl(canvas, formato, originalName), getNewName(originalName, sizes, formato));
			});
			return;
		}

		// no changes have been done here
		callback(null, null);
	};

	// returns the default format if the user hasn't picked one
	function getDefaultFormat(name) {
		if ((/\.png$/i).test(name))
			return 'png';
		return 'jpg80';
	}

	// Public Method to convert an image to another format (eg: jpg80)
	imageCrop.convertImage = function(srcImag, name, format) {
		var canvas = document.createElement('canvas');
		canvas.width = srcImag.width;
		canvas.height = srcImag.height;
		canvas.getContext('2d').drawImage(srcImag, 0, 0);

		return {
			image : generateDataUrl(canvas, format, name),
			name : getNewName(name, '', format)
		};
	};

	// Provides a new name adding the new size and type extension
	function getNewName(name, sizes, format) {
		var nuevaExt = sizes + '.' + format.substr(0,3);
		name = name.replace(/\.[^.]*$/, nuevaExt);
		if (name.indexOf('.') < 0)
			name += nuevaExt;

		return name;
	}

	function acercarZoom() {
		var e2 = escala;
		if (e2 >= 1) {
			e2 += 1;
			if (e2 > 10) e2 = 10;
		} else {
			e2 = Math.round(1 / e2);
			e2 = 1 / (e2 - 1);
		}
		changeZoom(e2);
	}

	function alejarZoom() {
		var e2 = escala;
		if (e2 > 1)
			e2 -= 1;
		else {
			e2 = Math.round(1 / e2) + 1;
			if (e2 > 10) e2 = 10;
			e2 = 1 / e2;
		}
		changeZoom(e2);
	}

	function keyDownDocument(e) {  // eslint-disable-line consistent-return
		switch (e.keyCode) {
			case 106: // *
				changeZoom(1);
				e.preventDefault();
				break;
			case 107: // +
				acercarZoom();
				e.preventDefault();
				break;
			case 109: // -
				alejarZoom();
				e.preventDefault();
				break;
			case 13:
				// Prevent closing the dialog if input pressed on an input
				// not sure that this will be enough
				if (e.target.nodeName == 'INPUT') {
					e.preventDefault();
					return false;
				}
				break;
		}
	}

	function changeZoom(nueva) {
		escala = nueva;
		var oEscala = $div.find('.escala');
		if (escala != 1) {
			var sTxt;
			if (escala > 1)
				sTxt = escala + ':1';
			else
				sTxt = '1:' + Math.round(1 / escala);

			oEscala.html( lang.scale.replace('{0}', sTxt) );
		} else {
			oEscala.html( lang.scale.replace('{0}', '1:1') );
			//oEscala.html('&nbsp;'); // Chrome does strange things with an empty span
		}

		if (jcrop_api) {
			recorteActivo = jcrop_api.tellSelect();
			jcrop_api.destroy();

			if (!recorteActivo.w)
				recorteActivo = null;
		}
		if (recorteActivo) {
			var width = recorteDeseado.width || recorteActivo.w;
			var height = recorteDeseado.height || recorteActivo.h;
			$div.find('.previsualizaciones img, .previsualizaciones canvas').width(width * escala + 'px').height(height * escala + 'px');
		}
		$laImagen.width(FichAncho * escala + 'px').height(FichAlto * escala + 'px');
		$laImagen.attr('width', Math.round(FichAncho * escala)).attr('height', Math.round(FichAlto * escala));

		var $imagePreview = $div.find('.imagePreview'),
			size = $imagePreview.data('size');
		if (size) {
			$imagePreview.width( size.width * escala + 'px').height( size.height * escala + 'px');
		}

		// for the enlargement preview we must adjust both size and position of the image itself
		adjustEnlargeSize();
		$div.find('.enlargePreview img').width(FichAncho * escala + 'px').height(FichAlto * escala + 'px');

		if (jcrop_api)
			iniciarCrop();
	}

	function iniciarCrop() {
		recorteAnterior = null;
		var config = {
			trueSize: [ FichAncho, FichAlto ],
			really_keepAspectRatio: document.getElementById(IdPrefix + '_LockedRatio').checked,
			aspectRatio: recorteDeseado.width / recorteDeseado.height,
			minSize: [ recorteDeseado.width, recorteDeseado.height ],
			bgColor: 'transparent',
			onChange: showCoords,
			onSelect: showCoords,
			allowSelect: false // evitar que se libere la selección
		};

		if (jcrop_api && recorteActivo) {
			config.setSelect = [ recorteActivo.x, recorteActivo.y, recorteActivo.x2, recorteActivo.y2 ];
		}

		$laImagen.Jcrop(config, function() {
			jcrop_api = this;
			changeEnlargeVisibility();
			$('.jcrop-keymgr').keydown(keyDownDocument);

			if (recorteActivo)
				jcrop_api.setSelect([ recorteActivo.x, recorteActivo.y, recorteActivo.x2, recorteActivo.y2 ]);
			else {
				jcrop_api.animateTo([ 0, 0, FichAncho || 50, FichAlto || 50 ]);
//				jcrop_api.animateTo([0, 0, recorteDeseado.width || 50, recorteDeseado.height || 50]);
			}
		});
	}

	var recorteAnterior;

	// Size changed in jCrop
	function showCoords(c) {
		$('#' + IdPrefix + '_recorteAncho').text(c.w.toFixed());
		$('#' + IdPrefix + '_recorteAlto').text(c.h.toFixed());
		var anterior = recorteAnterior,
			desiredRatio,
			currentRatio;
		recorteAnterior = c;
		if (!anterior)
			return;

		var keepRatio = $('#' + IdPrefix + '_LockedRatio').val();
		if (anterior.w == c.w && anterior.h != c.h) {
			// cambia la altura
			recorteDeseado.height = Math.round( recorteDeseado.height * c.h / anterior.h );
			if (!recorteDeseado.height)
				recorteDeseado.height = 1;

			// Check that it keeps sincronized the aspect ratio between current selection and the desired one (if resizing only one dimension)
			desiredRatio = recorteDeseado.width / recorteDeseado.height;
			currentRatio = c.w / c.h;

			if (desiredRatio != currentRatio)
				recorteDeseado.height = Math.round( recorteDeseado.width / ( keepRatio ? desiredRatio : currentRatio ) );

			$('#' + IdPrefix + '_TargetHeight').val( recorteDeseado.height );
		}
		if (anterior.h == c.h && anterior.w != c.w) {
			// cambia la anchura
			recorteDeseado.width = Math.round( recorteDeseado.width * c.w / anterior.w );
			if (!recorteDeseado.width)
				recorteDeseado.width = 1;

			// Check that it keeps sincronized the aspect ratio between current selection and the desired one (if resizing only one dimension)
			desiredRatio = recorteDeseado.width / recorteDeseado.height;
			currentRatio = c.w / c.h;

			if (desiredRatio != currentRatio)
				recorteDeseado.width = Math.round( recorteDeseado.height * ( keepRatio ? desiredRatio : currentRatio )  );

			if (!recorteDeseado.width)
				recorteDeseado.width = 1;

			$('#' + IdPrefix + '_TargetWidth').val( recorteDeseado.width );
		}
	}

	/**
		Calculates the optimal zoom to view the image
	*/
	function OptimalZoom(width, height) {
		var viewer = $div.find('.imagecrop-viewer'),
			maxAncho = viewer.width(),
			maxAlto = viewer.height();

		var escalado = 1,
			anchoTmp = width,
			altoTmp = height;

		if (!width || !height) return 1;

		if (altoTmp > maxAlto) {
			escalado = maxAlto / height;
			altoTmp = maxAlto;
			anchoTmp = Math.round(width * escalado);
		}
		if (anchoTmp > maxAncho) {
			escalado = maxAncho / width;
			anchoTmp = maxAncho;
		}

		if (escalado < 1) {
			var escala2;
			for (var i = 1; i < 10; i++) {
				escala2 = 1 / i;
				if (escalado > escala2)
					break;
			}
			escalado = escala2;
		}

		return escalado;
	}


	/**
		Given a Canvas and a string format returns a string with the data URL of the contents in that format
	*/
	function generateDataUrl(canvas, format, originalName) {
		var mime, quality;
		switch (format) {
			case 'jpg60':
				mime = 'image/jpeg';
				quality = 0.6;
				break;
			case 'jpg80':
				mime = 'image/jpeg';
				quality = 0.8;
				break;
			case 'jpg90':
				mime = 'image/jpeg';
				quality = 0.9;
				break;
			case 'png':
				mime = 'image/png';
				quality = 1;
				break;
		}

		// If it was a png and we're converting to jpg redraw over white background to avoid black for transparencies
		if (format != 'png' && (/.png$/i).test( originalName )) {
			var whiteCanvas = document.createElement('canvas');
			whiteCanvas.width = canvas.width;
			whiteCanvas.height = canvas.height;
			var ctx = whiteCanvas.getContext('2d');
			ctx.fillStyle = '#FFF'; // make it configurable?
			ctx.fillRect(0, 0, whiteCanvas.width, whiteCanvas.height);
			ctx.drawImage(canvas, 0, 0);
			return whiteCanvas.toDataURL(mime, quality);
		}
		return canvas.toDataURL(mime, quality);
	}

	function CalcularTamanoImg(src) {
		if (src.substr(0,5) == 'data:') {
			var encoded = src.length - 22;
			return formatearTamano(encoded * 4 / 3);
		}
		// use xhr for real files
		// TODO
		return '';
	}

	function formatearTamano(tamano) {
		if (tamano === 0)
			return '0';
		if (tamano < 1024)
			return '1 Kb';
		if (tamano < 1024 * 1024)
			return (tamano / 1024).toFixed() + ' Kb';

		return (tamano / (1024 * 1024)).toFixed(2).replace('.', ',') + ' Mb';
	}

	// Crop, then apply high quality resize and return a Canvas
	function CropAndResize(srcImage, recorte, width, height, callback) {
		$div.find('.acciones').hide();

		$div.find('.imagePreview').hide();
		$div.find('.previsualizaciones').html('<div class="imagecrop-processing"><div>' + lang.processing + '</div></div>').show();

		crop_resize_Image(srcImage, recorte, width, height, originalName, callback);
	}

	var tmpCanvas;

	function CargarPreview() {
		$div.find('.previsualizaciones div').hide();
		$('#' + IdPrefix + '_tamPreview span').hide();

		var formato = $('#' + IdPrefix + '_formato').val();
		var preview = $('#' + IdPrefix + '_Prev_' + formato);

		if (!preview.length) {
			preview = $('<div id="' + IdPrefix + '_Prev_' + formato + '"></div>');
			$div.find('.previsualizaciones').append(preview);
			$('#' + IdPrefix + '_tamPreview').append( $('<span id="' + IdPrefix + '_tam_' + formato + '"></span>') );
		}

		if (!preview.html()) {
			var width = recorteDeseado.width || Math.round(recorteActivo.w);
			//var height = recorteDeseado.height || Math.round(recorteActivo.h);

			var src = generateDataUrl(tmpCanvas, formato, originalName);

			$('#' + IdPrefix + '_tam_' + formato).text(CalcularTamanoImg(src));

			var img = document.createElement('img');
			img.src = src;
			img.style.width = width * escala + 'px';

			preview.append(img);
		}
		$('#' + IdPrefix + '_tam_' + formato).show();

		preview.show();
	}

})(window, jQuery);