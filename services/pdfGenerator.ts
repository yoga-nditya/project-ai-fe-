import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

/* ================= TYPES ================= */

export interface QuotationItem {
  jenis_limbah: string;
  kode_limbah: string;
  harga: string | number;
  satuan: string;
}

export interface QuotationData {
  nomor_depan: string;
  nama_perusahaan: string;
  alamat_perusahaan: string;
  items_limbah: QuotationItem[];
  harga_transportasi: string | number;
  harga_mou?: string | number;
  termin_hari: string | number;
}

export interface PDFResult {
  success: boolean;
  filePath?: string;
  message?: string;
  error?: string;
}

/* ================= UTIL ================= */

const formatRupiah = (n: string | number) =>
  parseInt(n.toString().replace(/\D/g, '') || '0', 10).toLocaleString('id-ID');

const getRomanMonth = () =>
  ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][new Date().getMonth()];

/* ================= HTML ================= */

const generateHTML = (data: QuotationData) => `
<html>
<head>
<style>
body { font-family: Arial; font-size: 11pt }
table { width: 100%; border-collapse: collapse }
th,td { border:1px solid #000; padding:6px }
th { background:#eee }
</style>
</head>
<body>

<h3 align="center">PT Karya Limbah Mandiri</h3>
<p align="center">No: ${data.nomor_depan}/KLM-QT/${getRomanMonth()}/${new Date().getFullYear()}</p>

<p>
<b>Kepada Yth.</b><br/>
<b>${data.nama_perusahaan}</b><br/>
${data.alamat_perusahaan}
</p>

<table>
<tr>
<th>No</th><th>Jenis</th><th>Kode</th><th>Harga</th><th>Satuan</th>
</tr>
${data.items_limbah.map((i,idx)=>`
<tr>
<td>${idx+1}</td>
<td>${i.jenis_limbah}</td>
<td>${i.kode_limbah}</td>
<td align="right">${formatRupiah(i.harga)}</td>
<td>${i.satuan}</td>
</tr>`).join('')}
<tr>
<td colspan="3"><b>Transportasi</b></td>
<td align="right">${formatRupiah(data.harga_transportasi)}</td>
<td>Ritase</td>
</tr>
</table>

</body>
</html>
`;

/* ================= PDF ================= */

export const generateQuotationPDF = async (
  data: QuotationData
): Promise<PDFResult> => {
  try {
    const { uri } = await Print.printToFileAsync({
      html: generateHTML(data),
    });

    return {
      success: true,
      filePath: uri,
      message: 'PDF berhasil dibuat',
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

/* ================= OPEN ================= */

export const generateAndOpenPDF = async (data: QuotationData) => {
  const res = await generateQuotationPDF(data);

  if (res.success && res.filePath) {
    if (Platform.OS === 'android') {
      const uri = await FileSystem.getContentUriAsync(res.filePath);
      await IntentLauncher.startActivityAsync(
        'android.intent.action.VIEW',
        { data: uri, type: 'application/pdf', flags: 1 }
      );
    } else {
      await Sharing.shareAsync(res.filePath);
    }
  }

  return res;
};

export default {
  generateQuotationPDF,
  generateAndOpenPDF,
};
