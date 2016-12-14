/**************************************************/
/*                                                */
/*     resampling.js                              */
/*                                      v0.88     */
/*                                                */
/*     Copyright 2016 Takeshi Okamoto (Japan)     */
/*                                                */
/*     Released under the MIT license             */
/*     https://github.com/TakeshiOkamoto/         */
/*                                                */
/*                            Date: 2016-12-14    */
/**************************************************/
"use strict"

////////////////////////////////////////////////////////////////////////////////
// Generic Function
////////////////////////////////////////////////////////////////////////////////

function set255(val){
  if (val > 255) return 255;
  if (val < 0) return 0;
  return val;
}

function set255r(val){
  if (val > 255) return 255;
  if (val < 0) return 0;
  return Math.round(val);
}

////////////////////////////////////////////////////////////////////////////////
// Main Function
////////////////////////////////////////////////////////////////////////////////

// バイキュービック法(双三次補間/BiCubic) 4x4 = 16画素
function BiCubic_Filter(x){
  if (x <= 1){
    return 1 - (2 * Math.pow(x,2)) + Math.pow(x,3);
  }else{
    if (x <= 2)
      return 4 - (8 * x) + (5 * Math.pow(x,2)) - Math.pow(x,3);
    else
      return 0;
  }
}

// カスタムフィルタ 3x3
// maskbits : フィルタのマスクビット
// divisor  : 除数(1-255)
// addition : 加算(0-255)
function EffectCustom3x3(source,destination,maskbits,divisor,addition){
  var height = source.height;
  var width  = source.width;
  var src    = source.data;
  var dst    = destination.data;

  var sRow,sCol,dRow,dCol; 
  var r,g,b,index,ty,tx;
  
  for (var y = 0; y < height; y++) {
    dRow= (y * width * 4);
         
    for (var x = 0;x < width; x++) {
      dCol = dRow + (x * 4);
      
      r=0; g=0; b=0; index=0;
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1;dx <= 1; dx++) {
          
          // Y軸
          ty = y + dy;
          if (ty >= (height-1)){
            ty = height-1;
          }else if (ty < 0){
            ty =0;            
          }          
          
          // X軸
          tx = x + dx;
          if (tx >= (width-1)){
            tx = width-1;
          }else if (tx < 0){
            tx =0;            
          }      
          
          sRow = (ty * width * 4);
          sCol = sRow + (tx * 4);
          r =  r + (src[sCol]   * maskbits[index]);
          g =  g + (src[sCol+1] * maskbits[index]);
          b =  b + (src[sCol+2] * maskbits[index]);          
          index++;
        }
      }
      dst[dCol]     = set255(Math.floor(r/divisor) + addition); 
      dst[dCol + 1] = set255(Math.floor(g/divisor) + addition);
      dst[dCol + 2] = set255(Math.floor(b/divisor) + addition);   
      dst[dCol + 3] = 255;     
    }
  }     
}

// リサンプリング
// interpolationfilter : 補間フィルターの関数を指定する
// prefilter           : [省略可能]事前フィルタ(ぼかし)  true or false(null) 
// ※事前フィルタを実施すると高品質に縮小する事が可能です。拡大では逆に品質が落ちます。
// ※関数を呼び出す前にリサイズするサイズをdestinationのwidth/heightに設定します。
function EffectResampling(source,destination,interpolationfilter,prefilter){
  var sh = source.height;
  var sw = source.width;  
  var dh = destination.height;
  var dw = destination.width;
  var src = source.data;
  var dst = destination.data;
 
  var sRow,sCol,dRow,dCol; 
  var xScale,yScale,xSize,ySize,xRange,yRange,xWeight,yWeight,ix,iy;
  
  if (typeof prefilter  !== "undefined"){
    if (prefilter){
      prefilter  = true;
    }else{
      prefilter  = false;
    }
  }else{
    prefilter  = false;
  } 

  // 事前フィルタ(ぼかし)
  if (prefilter) {
    
    // ソースデータのコピー
    var data = new Uint8Array(src.length);
    var tmp_source = {'data':data,'width':sw,'height':sh};  
    for (var i = 0; i < src.length; i++) {
      data[i] = src[i];
    }
    var tmp_destination = {'data':src,'width':sw,'height':sh}; 

    // ぼかし(弱)
    EffectCustom3x3(tmp_source,tmp_destination,[1,2,1,2,4,2,1,2,1],16,0); 
  }          
         
  // 元画像の割合
  if (sh == 1 || dh == 1) 
    yScale = sh / dh;
  else
    yScale = (sh-1) / (dh-1);
    
  if (sw == 1 || dw == 1) 
    xScale = sw / dw;
  else
    xScale = (sw-1) / (dw-1);
  
  for (var y = 0; y < dh; y++) {
    dRow= (y * dw * 4);
    
    // Y座標の計算
    ySize = y * yScale;
    yRange = Math.floor(ySize);
    
    for (var x = 0;x < dw; x++) {
      dCol = dRow + (x * 4);
      
      // X座標の計算
      xSize = x * xScale;
      xRange = Math.floor(xSize);
      
      var r=0,g=0,b=0;
      for (var dy = (yRange-1); dy <= (yRange+2); dy++) {

        // 縦方向の重みを取得
        yWeight = interpolationfilter(Math.abs(ySize - dy));
        
        // 範囲の調整
        iy = dy;
        if ((iy < 0) || (iy > (sh -1))) iy = yRange;

        for (var dx = (xRange-1); dx <= (xRange+2); dx++) {
 
          // 横方向の重みを取得
          xWeight = interpolationfilter(Math.abs(xSize - dx));

          // 範囲の調整
          ix = dx;
          if ((ix < 0) || (ix > (sw -1))) ix = xRange;
          
          // 変換元の座標
          sRow = (iy * sw * 4);
          sCol = sRow + (ix * 4);
          
          r = r + src[sCol]   * xWeight * yWeight;
          g = g + src[sCol+1] * xWeight * yWeight;
          b = b + src[sCol+2] * xWeight * yWeight;            
        }
        dst[dCol]     = set255r(r); 
        dst[dCol + 1] = set255r(g);
        dst[dCol + 2] = set255r(b);   
        dst[dCol + 3] = 255;  
      }   
    }
  }     
}
