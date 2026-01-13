import { Component, Input, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

// Import Leaflet and CSS so the global `L` is available at runtime
import * as L from 'leaflet';
// import 'leaflet/dist/leaflet.css';

interface CountryData {
  name: string;
  lat: number;
  lng: number;
  risk: number;
}

@Component({
  selector: 'app-geo-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="geo-container">
      <h4>Geographic Disease Prevalence</h4>
      <div #mapElement id="map-container" class="map"></div>
      <div class="legend">
        <div class="legend-item">
          <span class="legend-color" style="background: #fee5d9;"></span>
          <span>Low Risk</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #fcae91;"></span>
          <span>Moderate</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #fb6a4a;"></span>
          <span>High</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #cb181d;"></span>
          <span>Very High</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .geo-container {
        margin: 24px 0;
      }

      h4 {
        margin-bottom: 16px;
      }

      .map {
        height: 300px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        margin-bottom: 16px;
        z-index: 1;
      }

      .legend {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        background: var(--bg-light);
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .legend-color {
        width: 20px;
        height: 20px;
        border-radius: 3px;
        border: 1px solid rgba(0, 0, 0, 0.1);
      }

      @media (max-width: 640px) {
        .map {
          height: 250px;
        }

        .legend {
          flex-direction: column;
          gap: 8px;
        }
      }
    `,
  ],
})
export class GeoHeatmapComponent implements OnInit {
  @Input() country: string = 'RO';
  @Input() conditionName: string = '';
  @Input() geo: any | null = null; // server-provided geo object
  @ViewChild('mapElement') mapElement?: ElementRef;

  private map: any;
  private markers: any[] = [];

  // Sample data for educational purposes
  countryData: { [key: string]: CountryData[] } = {
    RO: [
      { name: 'Bucharest', lat: 44.4268, lng: 26.1025, risk: 0.7 },
      { name: 'Cluj-Napoca', lat: 46.7712, lng: 23.6236, risk: 0.5 },
      { name: 'Timișoara', lat: 45.7489, lng: 21.2087, risk: 0.6 },
    ],
    FR: [
      { name: 'Paris', lat: 48.8566, lng: 2.3522, risk: 0.6 },
      { name: 'Lyon', lat: 45.764, lng: 4.8357, risk: 0.5 },
    ],
    DE: [
      { name: 'Berlin', lat: 52.52, lng: 13.405, risk: 0.5 },
      { name: 'Munich', lat: 48.1351, lng: 11.582, risk: 0.4 },
    ],
    GB: [
      { name: 'London', lat: 51.5074, lng: -0.1278, risk: 0.6 },
      { name: 'Manchester', lat: 53.4808, lng: -2.2426, risk: 0.5 },
    ],
    US: [
      { name: 'New York', lat: 40.7128, lng: -74.006, risk: 0.7 },
      { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, risk: 0.6 },
    ],
  };

  ngOnInit() {
    setTimeout(() => this.initMap(), 100);
  }

  ngOnChanges() {
    if (this.map) {
      this.updateMap();
    }
  }

  private initMap() {
    if (!this.mapElement || !document.getElementById('map-container')) return;

    this.map = L.map('map-container').setView([54, 15], 3);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    this.updateMap();
  }

  private updateMap() {
    if (!this.map) return;

    // Clear existing markers
    this.markers.forEach((m) => this.map.removeLayer(m));
    this.markers = [];

    const data = this.countryData[this.country] || [];

    if (this.geo && this.geo.lat != null && this.geo.lon != null) {
      // Show a country-level prevalence circle
      const risk = (this.geo.estimatedPrevalencePercent ?? 0) / 100;
      const color = this.getRiskColor(risk);
      const radius = 20000 + risk * 50000; // meters — relative visual scale

      const circle = L.circle([this.geo.lat, this.geo.lon], {
        radius,
        fillColor: color,
        color: 'rgba(0,0,0,0.2)',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.45,
      })
        .bindPopup(
          `<b>${this.geo.countryLabel || this.country}</b><br>Estimated prevalence: ${
            this.geo.estimatedPrevalencePercent
          }%<br>Population: ${this.geo.population ?? 'n/a'}`
        )
        .addTo(this.map);

      this.markers.push(circle);
      // center map on country
      try {
        this.map.setView([this.geo.lat, this.geo.lon], 5);
      } catch {}
    } else {
      // fallback to city samples
      data.forEach((city) => {
        const color = this.getRiskColor(city.risk);
        const marker = L.circleMarker([city.lat, city.lng], {
          radius: 8 + city.risk * 10,
          fillColor: color,
          color: 'rgba(0,0,0,0.2)',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.7,
        })
          .bindPopup(`<b>${city.name}</b><br>Risk Level: ${(city.risk * 100).toFixed(0)}%`)
          .addTo(this.map);

        this.markers.push(marker);
      });
    }

    // Fit bounds
    if (this.markers.length > 0) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.2));
    }
  }

  private getRiskColor(risk: number): string {
    if (risk < 0.3) return '#fee5d9';
    if (risk < 0.6) return '#fcae91';
    if (risk < 0.8) return '#fb6a4a';
    return '#cb181d';
  }
}
