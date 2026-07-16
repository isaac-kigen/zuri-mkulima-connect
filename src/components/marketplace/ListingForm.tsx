"use client";

import { Form, Input, InputNumber, Select, Button, Space, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useState, useMemo } from "react";
import type { UploadFile } from "antd/lib/upload/interface";
import { getCsrfToken } from "@/lib/utils/csrf";

const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", "Embu", "Garissa", "Homa Bay",
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii",
  "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita Taveta",
  "Tana River", "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga",
  "Wajir", "West Pokot",
];

const CATEGORIES = ["Grains", "Vegetables", "Fruits", "Livestock", "Dairy", "Poultry", "Fish", "Seeds", "Fertilizer", "Equipment", "Other"];

const UNITS = ["kg", "g", "tonne", "litre", "piece", "bag", "crate", "bunch", "sack", "tray"];

interface Props {
  onSubmit: (values: any) => Promise<void>;
  initialValues?: any;
  loading?: boolean;
}

export default function ListingForm({ onSubmit, initialValues, loading }: Props) {
  const [form] = Form.useForm();

  // Initialize fileList from initialValues (existing photo URLs) for editing
  const initialFileList = useMemo(() => {
    if (initialValues?.photos && Array.isArray(initialValues.photos)) {
      return initialValues.photos.map((url: string, i: number) => ({
        uid: `existing-${i}`,
        name: `photo-${i + 1}`,
        status: "done" as const,
        url,
      }));
    }
    return [];
  }, [initialValues]);

  const [fileList, setFileList] = useState<UploadFile[]>(initialFileList);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (values: any) => {
    setUploading(true);
    try {
      // Upload photos first if there are new files
      let photoUrls: string[] = values.photos || [];
      
      if (fileList.length > 0) {
        const uploadedUrls: string[] = [];
        for (const file of fileList) {
          // Skip files that are already URLs (previously uploaded)
          if (file.url && !file.originFileObj) {
            uploadedUrls.push(file.url);
            continue;
          }
          // Upload new files
          if (file.originFileObj) {
            const formData = new FormData();
            formData.append("file", file.originFileObj);
            formData.append("bucket", "listings");
            
            const res = await fetch("/api/upload", {
              method: "POST",
              headers: { "x-csrf-token": getCsrfToken() },
              body: formData,
            });
            const data = await res.json();
            if (data.success) {
              uploadedUrls.push(data.data.url);
            } else {
              message.error(`Photo upload failed: ${data.error}`);
              setUploading(false);
              return;
            }
          }
        }
        photoUrls = uploadedUrls;
      }

      // Submit with photo URLs
      await onSubmit({ ...values, photos: photoUrls });
      if (!initialValues) {
        form.resetFields();
        setFileList([]);
      }
      message.success(initialValues ? "Listing updated!" : "Listing created!");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setFileList(newFileList);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={handleSubmit}
      style={{ maxWidth: 600 }}
    >
      <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
        <Input placeholder="e.g. Fresh Maize from Kitale" />
      </Form.Item>

      <Form.Item name="description" label="Description" rules={[{ required: true }]}>
        <Input.TextArea rows={3} placeholder="Describe your product..." />
      </Form.Item>

      <Space style={{ display: "flex" }} align="start">
        <Form.Item name="category" label="Category" rules={[{ required: true }]}>
          <Select style={{ width: 180 }} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </Form.Item>

        <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
          <Select style={{ width: 120 }} options={UNITS.map((u) => ({ value: u, label: u }))} />
        </Form.Item>
      </Space>

      <Space style={{ display: "flex" }} align="start">
        <Form.Item name="price_kes" label="Price (KES)" rules={[{ required: true }]}>
          <InputNumber min={1} style={{ width: 180 }} placeholder="Price per unit" />
        </Form.Item>

        <Form.Item name="quantity_available" label="Quantity Available" rules={[{ required: true }]}>
          <InputNumber min={0.1} step={0.1} style={{ width: 180 }} />
        </Form.Item>
      </Space>

      <Space style={{ display: "flex" }} align="start">
        <Form.Item name="location_county" label="County" rules={[{ required: true }]}>
          <Select style={{ width: 200 }} showSearch options={COUNTIES.map((c) => ({ value: c, label: c }))} />
        </Form.Item>

        <Form.Item name="location_ward" label="Ward (optional)">
          <Input style={{ width: 200 }} placeholder="e.g. Central Ward" />
        </Form.Item>
      </Space>

      <Form.Item name="photos" label="Photos">
        <Upload
          listType="picture"
          maxCount={5}
          fileList={fileList}
          onChange={handleUploadChange}
          beforeUpload={() => false}
          accept="image/jpeg,image/png,image/webp,image/gif"
        >
          <Button icon={<UploadOutlined />}>Upload Photos (max 5)</Button>
        </Upload>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading || uploading} size="large">
          {initialValues ? "Update Listing" : "Create Listing"}
        </Button>
      </Form.Item>
    </Form>
  );
}
