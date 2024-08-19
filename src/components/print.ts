/*
    Printing module! This bare-bones module is mostly just a wrapper for 
    npm-ipp, with some specialized features.
*/

import ipp, { MimeMediaType, PrintJobRequest } from 'ipp';
import c from 'config';

interface BinRecord {
    First: string;
    Last: string;
    ID: number,
    "Parts List": string[];
    "Title": string;
    "Country": string;
    "Jumper Wire Count": number;
    "Needs breadboard": boolean;

};

export function printPDF(printer: ipp.Printer, pdf: Buffer) {
    var msg: PrintJobRequest =
    {
        "operation-attributes-tag": {
            "requesting-user-name": "John Doe",
            "document-format": "application/pdf"
        },
        data: pdf
    };

    printer.execute("Print-Job", msg, function (err, res) {
        //console.log(res);
        console.log("Success!")
        //console.error(err);
    });
}

export async function printFromURL(url: string) {
    console.log("Printing label...\n");

    const pdfBlob = await fetch(url);
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const printer = new ipp.Printer(c.get("dinghy.printer-url"));
    printPDF(printer, buffer);

}

export function getInfo(printer: ipp.Printer) {
    var msg: ipp.GetPrinterAttributesRequest = {
        "operation-attributes-tag": {
            "requesting-user-name": "John Doe",
            "document-format": "image/pwg-raster" as MimeMediaType,
            "requested-attributes": ["document-format-supported"]
        }
    };

    printer.execute("Get-Printer-Attributes", msg, function (err, res) {
        console.log(res);
    });
}