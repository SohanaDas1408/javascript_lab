/**
 * CryptoPulse - HTML5 Canvas Chart Engine
 * Lightweight, zero-dependency, high-DPI Canvas charting for:
 * 1. Sparklines (in market cards and table rows)
 * 2. Interactive Area Chart with Hover Crosshairs & Tooltips (Detail Modal)
 * 3. Portfolio Asset Allocation Donut Chart
 */
const ChartRenderer = (function() {
  'use strict';

  // Configures Canvas resolution for crisp rendering on retina/high-DPI screens
  function setupCanvasDPI(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    const displayWidth = rect.width || canvas.width || 300;
    const displayHeight = rect.height || canvas.height || 150;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    return { ctx, width: displayWidth, height: displayHeight, dpr };
  }

  return {
    /**
     * Renders a lightweight sparkline graph
     * @param {HTMLCanvasElement} canvas
     * @param {number[]} points
     * @param {boolean} isPositive
     */
    renderSparkline: function(canvas, points, isPositive) {
      if (!canvas || !points || points.length < 2) return;

      const { ctx, width, height } = setupCanvasDPI(canvas);
      ctx.clearRect(0, 0, width, height);

      const min = Math.min(...points);
      const max = Math.max(...points);
      const range = (max - min) || 1;
      const padding = 4;
      const usableHeight = height - (padding * 2);

      const strokeColor = isPositive ? '#10b981' : '#ef4444'; // emerald vs red
      const fillColor = isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';

      // Calculate coordinates
      const stepX = width / (points.length - 1);
      const coords = points.map((p, idx) => ({
        x: idx * stepX,
        y: height - padding - ((p - min) / range * usableHeight)
      }));

      // Draw Gradient Fill
      ctx.beginPath();
      ctx.moveTo(coords[0].x, height);
      coords.forEach((pt, i) => {
        if (i === 0) {
          ctx.lineTo(pt.x, pt.y);
        } else {
          // Smooth curve using bezier
          const prev = coords[i - 1];
          const cx = (prev.x + pt.x) / 2;
          ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
        }
      });
      ctx.lineTo(coords[coords.length - 1].x, height);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, fillColor);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Draw Stroke Line
      ctx.beginPath();
      coords.forEach((pt, i) => {
        if (i === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          const prev = coords[i - 1];
          const cx = (prev.x + pt.x) / 2;
          ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
        }
      });
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Last point indicator dot
      const last = coords[coords.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();
    },

    /**
     * Renders an interactive detailed price history chart with crosshairs
     */
    renderDetailChart: function(canvas, dataPoints, options = {}) {
      if (!canvas || !dataPoints || dataPoints.length < 2) return;

      const isPositive = options.isPositive !== false;
      const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');

      const strokeColor = isPositive ? '#10b981' : '#ef4444';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
      const textColor = isDark ? '#94a3b8' : '#64748b';

      let mousePos = null;

      function draw() {
        const { ctx, width, height } = setupCanvasDPI(canvas);
        ctx.clearRect(0, 0, width, height);

        const leftMargin = 60;
        const bottomMargin = 25;
        const topMargin = 15;
        const rightMargin = 20;

        const chartW = width - leftMargin - rightMargin;
        const chartH = height - topMargin - bottomMargin;

        const min = Math.min(...dataPoints);
        const max = Math.max(...dataPoints);
        const range = (max - min) || 1;

        // Draw horizontal grid lines & labels
        const gridSteps = 4;
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor;

        for (let i = 0; i <= gridSteps; i++) {
          const yVal = min + (range * (i / gridSteps));
          const y = topMargin + chartH - (i / gridSteps * chartH);

          // Grid line
          ctx.beginPath();
          ctx.moveTo(leftMargin, y);
          ctx.lineTo(leftMargin + chartW, y);
          ctx.strokeStyle = gridColor;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Y label
          const formatted = yVal >= 1000 ? '$' + yVal.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '$' + yVal.toFixed(2);
          ctx.fillText(formatted, leftMargin - 8, y);
        }

        // Coordinates for points
        const stepX = chartW / (dataPoints.length - 1);
        const coords = dataPoints.map((val, idx) => ({
          x: leftMargin + (idx * stepX),
          y: topMargin + chartH - ((val - min) / range * chartH),
          val: val
        }));

        // Gradient Area Fill
        ctx.beginPath();
        ctx.moveTo(coords[0].x, topMargin + chartH);
        coords.forEach((pt, i) => {
          if (i === 0) {
            ctx.lineTo(pt.x, pt.y);
          } else {
            const prev = coords[i - 1];
            const cx = (prev.x + pt.x) / 2;
            ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
          }
        });
        ctx.lineTo(coords[coords.length - 1].x, topMargin + chartH);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, topMargin, 0, topMargin + chartH);
        grad.addColorStop(0, isPositive ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        coords.forEach((pt, i) => {
          if (i === 0) {
            ctx.moveTo(pt.x, pt.y);
          } else {
            const prev = coords[i - 1];
            const cx = (prev.x + pt.x) / 2;
            ctx.bezierCurveTo(cx, prev.y, cx, pt.y, pt.x, pt.y);
          }
        });
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Crosshair and hover tooltip if mouse is inside chart
        if (mousePos && mousePos.x >= leftMargin && mousePos.x <= leftMargin + chartW) {
          // Find closest point
          let closest = coords[0];
          let minDist = Math.abs(mousePos.x - coords[0].x);
          for (let i = 1; i < coords.length; i++) {
            const dist = Math.abs(mousePos.x - coords[i].x);
            if (dist < minDist) {
              minDist = dist;
              closest = coords[i];
            }
          }

          // Vertical crosshair
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.moveTo(closest.x, topMargin);
          ctx.lineTo(closest.x, topMargin + chartH);
          ctx.strokeStyle = isDark ? '#cbd5e1' : '#64748b';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);

          // Circle on data point
          ctx.beginPath();
          ctx.arc(closest.x, closest.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = strokeColor;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Tooltip bubble
          const tipText = '$' + closest.val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          ctx.font = 'bold 11px Inter, sans-serif';
          const textW = ctx.measureText(tipText).width;
          const bubbleW = textW + 16;
          const bubbleH = 24;
          let bubbleX = closest.x - (bubbleW / 2);
          let bubbleY = closest.y - 32;

          if (bubbleX < leftMargin) bubbleX = leftMargin;
          if (bubbleX + bubbleW > width - rightMargin) bubbleX = width - rightMargin - bubbleW;
          if (bubbleY < topMargin) bubbleY = closest.y + 12;

          // Tooltip container
          ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.25)';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 6);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Tooltip text
          ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tipText, bubbleX + (bubbleW / 2), bubbleY + (bubbleH / 2));
        }
      }

      // Initial draw
      draw();

      // Bind mouse interactions (avoid duplicate listeners)
      if (!canvas._boundHover) {
        canvas._boundHover = true;

        canvas.addEventListener('mousemove', function(e) {
          const rect = canvas.getBoundingClientRect();
          mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          };
          draw();
        });

        canvas.addEventListener('mouseleave', function() {
          mousePos = null;
          draw();
        });
      }
    },

    /**
     * Renders a Donut Chart for Portfolio Asset Allocation
     */
    renderAllocationDonut: function(canvas, slices, totalValue) {
      if (!canvas || !slices || slices.length === 0) return;

      const { ctx, width, height } = setupCanvasDPI(canvas);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) - 15;
      const innerRadius = radius * 0.65;

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];
      let startAngle = -Math.PI / 2;

      slices.forEach((slice, idx) => {
        const sliceAngle = (slice.value / totalValue) * (Math.PI * 2);
        const endAngle = startAngle + sliceAngle;
        const color = colors[idx % colors.length];

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = document.body.classList.contains('light-theme') ? '#ffffff' : '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        startAngle = endAngle;
      });

      // Center text
      const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.fillText('Total Value', centerX, centerY - 10);

      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.fillText('$' + (totalValue >= 1000 ? (totalValue / 1000).toFixed(1) + 'k' : totalValue.toFixed(0)), centerX, centerY + 10);
    }
  };
})();
