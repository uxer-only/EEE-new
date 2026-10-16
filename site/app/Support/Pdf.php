<?php

namespace App\Support;

/**
 * A very small PDF writer: one A4 page with text, lines and filled rectangles in Helvetica.
 * Enough for invoices without an extra library. Coordinates are in millimetres from the bottom left.
 */
class Pdf
{
    private const MM = 72 / 25.4;
    private string $ops = '';

    // Character widths (1/1000 em) for ASCII 32–126, from the standard Helvetica font metrics.
    private const W_REGULAR = [278,278,355,556,556,889,667,222,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,222,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
    private const W_BOLD = [278,333,474,556,556,889,722,278,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,278,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

    public const WIDTH = 210;
    public const HEIGHT = 297;

    private string $font = 'F1';
    private float $size = 10;
    private string $color = '0 0 0';

    public function font(bool $bold, float $size): self
    {
        $this->font = $bold ? 'F2' : 'F1';
        $this->size = $size;
        return $this;
    }

    public function color(string $hex): self
    {
        $h = ltrim($hex, '#');
        $this->color = sprintf('%.3f %.3f %.3f', hexdec(substr($h, 0, 2)) / 255, hexdec(substr($h, 2, 2)) / 255, hexdec(substr($h, 4, 2)) / 255);
        return $this;
    }

    public function text(float $x, float $y, string $s): self
    {
        $this->ops .= sprintf("BT %s rg /%s %.2f Tf %.2f %.2f Td (%s) Tj ET\n", $this->color, $this->font, $this->size, $x * self::MM, $y * self::MM, $this->esc($s));
        return $this;
    }

    public function textRight(float $x, float $y, string $s): self
    {
        return $this->text($x - $this->width($s), $y, $s);
    }

    public function rect(float $x, float $y, float $w, float $h): self
    {
        $this->ops .= sprintf("%s rg %.2f %.2f %.2f %.2f re f\n", $this->color, $x * self::MM, $y * self::MM, $w * self::MM, $h * self::MM);
        return $this;
    }

    public function line(float $x1, float $y1, float $x2, float $y2): self
    {
        $this->ops .= sprintf("%s RG 0.5 w %.2f %.2f m %.2f %.2f l S\n", $this->color, $x1 * self::MM, $y1 * self::MM, $x2 * self::MM, $y2 * self::MM);
        return $this;
    }

    public function output(): string
    {
        $objs = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            sprintf('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>', self::WIDTH * self::MM, self::HEIGHT * self::MM),
            "<< /Length ".strlen($this->ops)." >>\nstream\n".$this->ops."endstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objs as $i => $o) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n$o\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objs) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $off) {
            $pdf .= sprintf("%010d 00000 n \n", $off);
        }
        return $pdf."trailer\n<< /Size ".(count($objs) + 1)." /Root 1 0 R >>\nstartxref\n$xref\n%%EOF";
    }

    private function enc(string $s): string
    {
        $out = @iconv('UTF-8', 'Windows-1252//TRANSLIT', $s);
        return $out === false ? preg_replace('/[^\x20-\x7E]/', '?', $s) : $out;
    }

    private function esc(string $s): string
    {
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $this->enc($s));
    }

    /** Width of a text in millimetres with the current font. */
    private function width(string $s): float
    {
        $w = $this->font === 'F2' ? self::W_BOLD : self::W_REGULAR;
        $total = 0;
        foreach (str_split($this->enc($s)) as $ch) {
            $o = ord($ch);
            $total += ($o >= 32 && $o <= 126) ? $w[$o - 32] : 556;
        }
        return $total / 1000 * $this->size / self::MM;
    }
}
