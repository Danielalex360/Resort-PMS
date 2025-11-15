export async function attachFiles({ supabase, table, id, urlsField, urls }) {
  const { data: record, error: fetchError } = await supabase
    .from(table)
    .select(urlsField)
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching record:', fetchError);
    return null;
  }

  const existingUrls = record[urlsField] || [];
  const merged = [...existingUrls, ...(urls || [])];

  const { error: updateError } = await supabase
    .from(table)
    .update({ [urlsField]: merged })
    .eq('id', id);

  if (updateError) {
    console.error('Error updating record:', updateError);
    return null;
  }

  return { id, [urlsField]: merged };
}

export async function removeFile({ supabase, table, id, urlsField, url }) {
  const { data: record, error: fetchError } = await supabase
    .from(table)
    .select(urlsField)
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching record:', fetchError);
    return null;
  }

  const existingUrls = record[urlsField] || [];
  const filtered = existingUrls.filter((u) => u !== url);

  const { error: updateError } = await supabase
    .from(table)
    .update({ [urlsField]: filtered })
    .eq('id', id);

  if (updateError) {
    console.error('Error updating record:', updateError);
    return null;
  }

  return { id, [urlsField]: filtered };
}

export async function uploadFile({ supabase, bucket, file, path }) {
  const fileName = `${path}/${Date.now()}_${file.name}`;

  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    console.error('Error uploading file:', error);
    return null;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function deleteFile({ supabase, bucket, path }) {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error('Error deleting file:', error);
    return false;
  }

  return true;
}
