<?php
   /**
   * Transport for Cross-domain AJAX calls
   *
   * This is an implementation of a transport channel for utilizing cross-domain
   * AJAX calls. This script is passed the data through AJAX along with two special
   * hidden field containing the acttion URL and the http method (GET/POST). It then 
   * sends the form fields to that URL and returns the response.
   *
   * @package CrossDomainAjax
   * @category CURL
   * @author Md Emran Hasan <phpfour@gmail.com>
   * @link https://www.phpfour.com
   *
   * Adapted for eventor by Olav@kvittem.no 2013-05
   */
   // The actual form action

header( 'Content-Type: text/html; charset=utf-8');

   $action = $_REQUEST['url'];
   // Submission method
   $method = $_REQUEST['method'];
   // Query string
   $fields = '?';
   // Prepare the fields for query string, don't include the action URL OR method
if (count($_REQUEST) > 2){
  foreach ($_REQUEST as $key => $value){
    if ($key != 'url' && $key != 'method'){
        // $fields .=  '&' . $key . '=' . rawurlencode($value) ;
      $fields .=  '&' . $key . '=' . $value ;
      // echo "key=".$key . " val=".$value . "\n";
    }
  }
}
// Strip the last comma
//$fields = substr($fields, 0, strlen($fields) - 1);

//if ( strpos( $action, '/api/events') ||  strpos( $action, '/api/results')){
    // Initiate cURL
    $ch = curl_init();

    // Do we need to POST or GET ?
    if (strtoupper($method) == 'POST'){ 
        curl_setopt($ch, CURLOPT_URL, $action);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $fields);
    } else {
        curl_setopt($ch, CURLOPT_URL, $action  . $fields); 
        // echo "url:" . $action . $fields . "\n";
   }

    // Follow redirects and return the transfer
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
    // curl_setopt($ch, CURLOPT_HTTPHEADER, array("ApiKey:  f7288b4d475447d08ec4316ebb0d432c"));
    // Get result and close cURL
    $result = curl_exec($ch);
    // Return the response
 
    echo $result;
 
    // error_log(curl_getinfo ($ch, CURLINFO_EFFECTIVE_URL ) );
    // error_log(curl_error($method));
    // error_log($result);

    curl_close($ch);
// } else {
//    error_log('invalid action: ' . $action);
// }
 

?>
