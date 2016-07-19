#!/bin/bash
 
# some variables
# refactoring the script such that all these values are
# passed from the outside as arguments should be easy
 
 if [ $# -lt 4 ]
 then
 	echo "Usage: $0 TO Subject Body Filename"
	exit
fi
from="orders@orderdude.com"
to="$1"
subject="$2"
boundary="ZZ_/afg6432dfgkl.94531q"
body="$3"
shift
shift
shift
declare -a attachments
attachments=( $* )
 
 get_mimetype(){
  # warning: assumes that the passed file exists
  #file --mime-type "$1" | sed 's/.*: //' 
  echo "application/pdf"
}

# Build headers
{
 
printf '%s\n' "From: $from
To: $to
Reply-To: $to
Sender: $to
Bcc: partha@parthamukherjee.com
Subject: $subject
Mime-Version: 1.0
Content-Type: multipart/mixed; boundary=\"$boundary\"
 
--${boundary}
Content-Type: text/plain; charset=\"US-ASCII\"
Content-Transfer-Encoding: 7bit
Content-Disposition: inline
 
$body
"
 
# now loop over the attachments, guess the type
# and produce the corresponding part, encoded base64
for file in "${attachments[@]}"; do
 
  [ ! -f "$file" ] && echo "Warning: attachment $file not found, skipping" >&2 && continue
 
  mimetype=$(get_mimetype "$file") 
 
  printf '%s\n' "--${boundary}
Content-Type: $mimetype
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename=\"$file\"
"
 
  base64 "$file"
  echo
done
 
# print last boundary with closing --
printf '%s\n' "--${boundary}--"
 
} | /usr/sbin/sendmail.real -t -oi   # one may also use -f here to set the envelope-from
