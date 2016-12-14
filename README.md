# resampling.js
High quality resampling (Image scaling), with pure JavaScript.


## How to use 

function EffectResampling(source, destination, interpolationfilter, prefilter)

| Argument | Contents |
|:-----------|:-------------|
| source | ImageData Object |
| destination | ImageData Object (return value) |
| interpolationfilter | Always "BiCubic_Filter" |
| prefilter | true or false ... Use "true" only when reducing the image |
Set width / height of "destination" before calling the function.    

## Caution
If the HTML file is not uploaded to the server, it may not work depending on browser specifications.

## Contact
sorry, no warranty, no support. English Can understand only 3-year-old level.  

## Author
Copyright (c) 2016 Takeshi Okamoto

## Licence
MIT license.  
