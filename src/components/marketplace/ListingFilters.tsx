"use client";

import { Input, Select, Slider, Space, Button, Collapse } from "antd";
import { SearchOutlined, ReloadOutlined, FilterOutlined } from "@ant-design/icons";
import type { ListingFilters } from "@/lib/db/types";
import { useState } from "react";

const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay",
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
  "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta",
  "Tana River", "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga",
  "Wajir", "West Pokot",
];

const CATEGORIES = [
  "Grains", "Vegetables", "Fruits", "Livestock", "Dairy",
  "Poultry", "Fish", "Seeds", "Fertilizer", "Equipment", "Other",
];

interface Props {
  onFilter: (filters: ListingFilters) => void;
  showStatus?: boolean;
}

export default function ListingFilters({ onFilter, showStatus = false }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>();
  const [county, setCounty] = useState<string>();
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [sort, setSort] = useState<string>("latest");
  const [status, setStatus] = useState<string>();

  const applyFilters = () => {
    onFilter({
      search: search || undefined,
      category,
      county,
      min_price: priceRange[0] > 0 ? priceRange[0] : undefined,
      max_price: priceRange[1] < 100000 ? priceRange[1] : undefined,
      sort: sort as any,
      status: status as any,
    });
  };

  const resetFilters = () => {
    setSearch("");
    setCategory(undefined);
    setCounty(undefined);
    setPriceRange([0, 100000]);
    setSort("latest");
    setStatus(undefined);
    onFilter({ sort: "latest" });
  };

  return (
    <div className="filters-wrap">
      {/* Search bar - always visible */}
      <Input
        placeholder="Search for produce, grains, livestock..."
        prefix={<SearchOutlined style={{ color: "#8a9a8a" }} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onPressEnter={applyFilters}
        allowClear
        size="large"
        className="filter-search"
      />

      {/* Expandable filters on mobile */}
      <Collapse
        ghost
        size="small"
        className="filter-collapse"
        expandIconPosition="end"
        items={[
          {
            key: "filters",
            label: (
              <span style={{ fontSize: 13, fontWeight: 500, color: "#5a6e5a" }}>
                <FilterOutlined style={{ marginRight: 6 }} />
                Filters & Sort
              </span>
            ),
            children: (
              <div className="filter-body">
                <Space wrap size="small" style={{ width: "100%" }}>
                  <Select
                    placeholder="Category"
                    value={category}
                    onChange={(v) => setCategory(v)}
                    allowClear
                    style={{ minWidth: 130 }}
                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />
                  <Select
                    placeholder="County"
                    value={county}
                    onChange={(v) => setCounty(v)}
                    allowClear
                    showSearch
                    style={{ minWidth: 140 }}
                    options={COUNTIES.map((c) => ({ value: c, label: c }))}
                  />
                  <Select
                    value={sort}
                    onChange={(v) => setSort(v)}
                    style={{ minWidth: 150 }}
                    options={[
                      { value: "latest", label: "🕐 Latest" },
                      { value: "price_asc", label: "💰 Price: Low → High" },
                      { value: "price_desc", label: "💰 Price: High → Low" },
                    ]}
                  />
                  {showStatus && (
                    <Select
                      placeholder="Status"
                      value={status}
                      onChange={(v) => setStatus(v)}
                      allowClear
                      style={{ minWidth: 120 }}
                      options={[
                        { value: "active", label: "Active" },
                        { value: "inactive", label: "Inactive" },
                        { value: "archived", label: "Archived" },
                      ]}
                    />
                  )}
                </Space>

                <div className="filter-price">
                  <span className="filter-price-label">
                    Price: KES {priceRange[0].toLocaleString()} — KES {priceRange[1].toLocaleString()}
                  </span>
                  <Slider
                    range
                    min={0}
                    max={100000}
                    step={500}
                    value={priceRange}
                    onChange={(v) => setPriceRange(v as [number, number])}
                  />
                </div>

                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button icon={<ReloadOutlined />} onClick={resetFilters} size="small">
                    Reset
                  </Button>
                  <Button type="primary" onClick={applyFilters} size="small">
                    Apply Filters
                  </Button>
                </Space>
              </div>
            ),
          },
        ]}
      />

      <style jsx>{`
        .filters-wrap {
          width: 100%;
        }
        .filter-search {
          border-radius: 12px !important;
          border: 1px solid #e2e8e0;
          transition: all 200ms ease;
        }
        .filter-search:focus,
        .filter-search:hover {
          border-color: #1a7a1a;
          box-shadow: 0 0 0 2px rgba(26,122,26,0.08);
        }
        .filter-collapse {
          margin-top: 8px;
          background: #fff;
          border-radius: 10px !important;
          border: 1px solid #e2e8e0 !important;
        }
        .filter-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .filter-price {
          max-width: 100%;
        }
        .filter-price-label {
          font-size: 12px;
          color: #8a9a8a;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
