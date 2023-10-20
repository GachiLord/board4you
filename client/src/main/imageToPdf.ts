import PDFDocument from 'pdfkit';

export default function (pages: string | any[], size: [number, number]) {
    const doc = new PDFDocument({ margin: 0, size })

	for (let index = 0; index < pages.length; index++) {
		doc.image(pages[index], 0, 0, { fit: size, align: 'center', valign: 'center' })

		if (pages.length != index + 1) doc.addPage()
	}

    doc.end()

    return doc
}