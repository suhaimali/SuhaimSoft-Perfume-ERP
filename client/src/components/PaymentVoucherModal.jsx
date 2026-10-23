import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Share2,
  MessageCircle,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getPaymentVoucherPdfBlobUrl,
  generatePaymentVoucherPdf,
  createPaymentVoucherPdfDoc,
} from '../utils/pdfGenerator';

/**
 * PaymentVoucherModal
 * Clean, lightweight, simple in-page Chrome PDF Viewer for Payment Vouchers.
 * Light color theme with essential Share, Download, and Close actions.
 */
export default function PaymentVoucherModal({ payment, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMenuRef = useRef(null);

  useEffect(() => {
    if (!payment) return;

    setLoadingPdf(true);
    setIframeLoaded(false);
    let url = null;
    try {
      url = getPaymentVoucherPdfBlobUrl(payment);
      setBlobUrl(url);
    } catch (err) {
      console.error('Failed to generate Payment Voucher PDF Blob:', err);
      toast.error('Could not render Voucher preview');
    } finally {
      setLoadingPdf(false);
    }

    // Fallback timer so loading overlay never stays stuck
    const timer = setTimeout(() => {
      setIframeLoaded(true);
    }, 1200);

    return () => {
      clearTimeout(timer);
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [payment]);

  // Close share menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false);
      }
    }
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  // Keyboard shortcut listener for Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!payment) return null;

  const partyName =
    payment.customer?.name ||
    payment.supplier?.name ||
    payment.customerName ||
    payment.supplierName ||
    'Retail Client';

  const partyPhone = payment.customer?.phone || payment.supplier?.phone || '';
  const isReceipt = payment.direction === 'in';
  const voucherType = isReceipt ? 'Cash Inflow' : 'Cash Outflow';

  const rawDate = payment.date || payment.createdAt;
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Today';

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      generatePaymentVoucherPdf(payment);
      toast.success(`Voucher ${payment.number} downloaded`);
    } catch (err) {
      toast.error('Failed to download voucher PDF');
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  const getShareSummaryText = () => {
    return `*SUHAIMSOFT PERFUMES — OFFICIAL PAYMENT VOUCHER*\n*Voucher No:* ${payment.number}\n*Type:* ${voucherType.toUpperCase()}\n*Date:* ${formattedDate}\n*Party:* ${partyName}\n*Payment Mode:* ${(payment.method || 'cash').toUpperCase()}\n${
      payment.reference ? `*Reference:* ${payment.reference}\n` : ''
    }*Total Amount:* ₹${Number(payment.amount || 0).toLocaleString('en-IN')}\n\nCertified Accounting Record.`;
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(getShareSummaryText());
    const rawPhone = (partyPhone || '').replace(/\D/g, '');
    let url = `https://wa.me/?text=${message}`;
    if (rawPhone && rawPhone.length >= 10) {
      const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
      url = `https://wa.me/${formattedPhone}?text=${message}`;
    }
    window.open(url, '_blank');
    setShowShareMenu(false);
    toast.success('Opening WhatsApp...');
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(getShareSummaryText());
      setCopied(true);
      toast.success('Voucher details copied!');
      setTimeout(() => {
        setCopied(false);
        setShowShareMenu(false);
      }, 1500);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleNativeShare = async () => {
    setShowShareMenu(false);
    try {
      const doc = createPaymentVoucherPdfDoc(payment);
      if (doc) {
        const blob = doc.output('blob');
        const file = new File([blob], `Voucher-${payment.number || 'payment'}.pdf`, {
          type: 'application/pdf',
        });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Payment Voucher ${payment.number}`,
            text: `Payment Voucher ${payment.number} from SuhaimSoft Perfumes`,
            files: [file],
          });
          toast.success('Voucher shared successfully');
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({
          title: `Payment Voucher ${payment.number}`,
          text: getShareSummaryText(),
        });
        toast.success('Voucher shared successfully');
      } else {
        handleWhatsAppShare();
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Could not open system share dialog');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Simple Light Header */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {/* Left: Voucher Specs & Party Details */}
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm sm:text-base text-slate-900 tracking-tight truncate">
                Payment Voucher &mdash; {payment.number || 'PAY'}
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wider shrink-0 ${
                  isReceipt
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {voucherType}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              <span>{partyName}</span>
              {partyPhone && <span> &bull; {partyPhone}</span>}
              <span> &bull; {formattedDate}</span>
              <span className="font-medium text-slate-700 ml-1.5">
                (₹{Number(payment.amount || 0).toLocaleString('en-IN')})
              </span>
            </p>
          </div>

          {/* Right: Clean Light Actions (Share, Download, Close) */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Share Dropdown */}
            <div className="relative" ref={shareMenuRef}>
              <button
                type="button"
                onClick={() => setShowShareMenu((prev) => !prev)}
                title="Share Voucher"
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share</span>
              </button>

              {showShareMenu && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl p-1 shadow-lg z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                    <span>Share on WhatsApp</span>
                  </button>

                  {/* Device Share */}
                  {typeof navigator !== 'undefined' && Boolean(navigator.share) && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-slate-500" />
                      <span>Device Share...</span>
                    </button>
                  )}

                  {/* Copy Text */}
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    <span>{copied ? 'Copied Receipt!' : 'Copy Text Receipt'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Download Button */}
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownload}
              title="Download PDF"
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{isDownloading ? 'Saving...' : 'Download'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clean Light Body */}
        <div className="flex-1 bg-white relative overflow-hidden flex flex-col">
          {(!iframeLoaded || loadingPdf) && (
            <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-slate-600 animate-spin" />
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-800">Loading Payment Voucher...</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Preparing PDF document</p>
              </div>
            </div>
          )}

          {blobUrl ? (
            <iframe
              src={`${blobUrl}#toolbar=1&navpanes=0&view=FitH`}
              title={`Payment Voucher ${payment.number}`}
              className={`w-full h-full border-0 bg-white transition-opacity duration-200 ${
                iframeLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setIframeLoaded(true)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2 p-6 text-center">
              <p className="text-sm font-semibold text-slate-800">Unable to preview document</p>
              <button
                type="button"
                onClick={handleDownload}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold"
              >
                Download PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
