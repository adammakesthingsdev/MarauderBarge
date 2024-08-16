import ipp, { MimeMediaType, PrintJobRequest } from 'ipp';
import fs from 'fs';
import PDFDocument from 'pdfkit'
import Airtable, { FieldSet } from 'airtable';
import c from 'config';

interface BinRecord{
    First: string;
    Last: string;
    ID: number,
    "Parts List": string[];
    "Title": string;
    "Country": string;
    "Jumper Wire Count": number;
    "Needs breadboard": boolean;

};

export function printPDF(printer:ipp.Printer,pdf:Buffer){
    var msg:PrintJobRequest = 
    {
        "operation-attributes-tag": {
            "requesting-user-name": "John Doe",
            "document-format": "application/pdf"
        },
        data: pdf
    };

    printer.execute("Print-Job", msg, function(err, res) 
    {
        //console.log(res);
        console.log("Success!")
        //console.error(err);
    });
}

export async function printFromURL(url:string){
    console.log("Printing label...\n");

    const pdfBlob = await fetch(url);
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const printer = new ipp.Printer(c.get("physical.printer-url"));
    printPDF(printer,buffer);

}

export function getInfo(printer:ipp.Printer)
{
    var msg:ipp.GetPrinterAttributesRequest = {
        "operation-attributes-tag": {
          "requesting-user-name": "John Doe",
          "document-format": "image/pwg-raster" as MimeMediaType,
          "requested-attributes": ["document-format-supported"]
        }
      };
  
    printer.execute("Get-Printer-Attributes", msg, function(err, res) {
        console.log(res);
    });
}

//const printer = ipp.Printer("http://10.101.123.164:631/printers/Printer_POS_80");
//printReceipt(printer);
//getInfo(printer);