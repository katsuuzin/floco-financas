package br.com.kat.flocofinancas.updates
import org.json.JSONArray
import org.json.JSONObject
import org.xmlpull.v1.XmlPullParser
import android.util.Xml
import java.util.zip.ZipFile
import java.io.File
import java.util.Calendar
import java.util.TimeZone
import java.util.Locale

object SpreadsheetParser {
 private fun parser(zip:ZipFile,path:String):XmlPullParser {
  val entry=zip.getEntry(path)?:throw Exception("Planilha XLSX incompleta: $path")
  if(entry.size<0||entry.size>4000000)throw Exception("Parte da planilha acima do limite.")
  val xml=zip.getInputStream(entry).use{it.readBytes()}.toString(Charsets.UTF_8)
  if(xml.contains("<!DOCTYPE",true)||xml.contains("<!ENTITY",true))throw Exception("XML com entidades não é aceito.")
  return Xml.newPullParser().apply{setInput(xml.reader())}
 }
 fun read(file:File):String=ZipFile(file).use{zip->
  var total=0L;var entries=0;zip.entries().asSequence().forEach{total+=maxOf(0,it.size);entries++;if(total>32000000||entries>10000)throw Exception("Planilha expandida acima do limite.")}
  val strings=mutableListOf<String>();if(zip.getEntry("xl/sharedStrings.xml")!=null){val x=parser(zip,"xl/sharedStrings.xml");var current=StringBuilder();while(x.eventType!=XmlPullParser.END_DOCUMENT){if(x.eventType==XmlPullParser.START_TAG&&x.name=="si")current=StringBuilder();if(x.eventType==XmlPullParser.START_TAG&&x.name=="t")current.append(x.nextText());if(x.eventType==XmlPullParser.END_TAG&&x.name=="si")strings.add(current.toString());x.next()}}
  val dateFormats=mutableSetOf<Int>();val dateStyles=mutableSetOf<Int>()
  if(zip.getEntry("xl/styles.xml")!=null){val x=parser(zip,"xl/styles.xml");var cellXfs=false;var style=0;while(x.eventType!=XmlPullParser.END_DOCUMENT){if(x.eventType==XmlPullParser.START_TAG){if(x.name=="numFmt"){val id=x.getAttributeValue(null,"numFmtId")?.toIntOrNull();val format=x.getAttributeValue(null,"formatCode").orEmpty().replace(Regex("\\[[^\\]]*\\]"),"").replace(Regex("\"[^\"]*\""),"");if(id!=null&&Regex("(?i)[dy]").containsMatchIn(format))dateFormats.add(id)};if(x.name=="cellXfs")cellXfs=true;if(x.name=="xf"&&cellXfs){val id=x.getAttributeValue(null,"numFmtId")?.toIntOrNull()?:0;if(id in 14..22||id in dateFormats)dateStyles.add(style);style++}};if(x.eventType==XmlPullParser.END_TAG&&x.name=="cellXfs")cellXfs=false;x.next()}}
  val relations=mutableMapOf<String,String>();val rel=parser(zip,"xl/_rels/workbook.xml.rels");while(rel.eventType!=XmlPullParser.END_DOCUMENT){if(rel.eventType==XmlPullParser.START_TAG&&rel.name=="Relationship"){val id=rel.getAttributeValue(null,"Id");val target=rel.getAttributeValue(null,"Target").orEmpty();if(rel.getAttributeValue(null,"TargetMode")!="External"){val path=java.net.URI("xl/").resolve(target).normalize().path.trimStart('/');if(path.startsWith("xl/")&&!path.contains("../"))relations[id]=path}};rel.next()}
  val sheets=mutableListOf<Pair<String,String>>();var epoch1904=false;val workbook=parser(zip,"xl/workbook.xml");while(workbook.eventType!=XmlPullParser.END_DOCUMENT){if(workbook.eventType==XmlPullParser.START_TAG){if(workbook.name=="workbookPr")epoch1904=workbook.getAttributeValue(null,"date1904") in listOf("1","true");if(workbook.name=="sheet"){var id:String?=null;for(i in 0 until workbook.attributeCount)if(workbook.getAttributeName(i)=="id"||workbook.getAttributeName(i)=="r:id")id=workbook.getAttributeValue(i);val path=relations[id];if(path!=null)sheets.add((workbook.getAttributeValue(null,"name")?:"Planilha") to path)}};workbook.next()}
  if(sheets.isEmpty()||sheets.size>20)throw Exception("Selecione um XLSX com uma a vinte abas.")
  var textSize=0;val result=JSONArray();for((name,path) in sheets){val rows=JSONArray();val x=parser(zip,path);var row=mutableListOf<String>();var column=0;var type="";var style=0;var value="";var inside=false
   while(x.eventType!=XmlPullParser.END_DOCUMENT){if(x.eventType==XmlPullParser.START_TAG){when(x.name){"row"->row=mutableListOf();"c"->{inside=true;type=x.getAttributeValue(null,"t").orEmpty();style=x.getAttributeValue(null,"s")?.toIntOrNull()?:0;value="";val reference=x.getAttributeValue(null,"r").orEmpty();column=0;for(c in reference.takeWhile{it.isLetter()})column=column*26+(c.uppercaseChar()-'A'+1);column=(column-1).coerceAtLeast(0);if(column>=200)throw Exception("Limite de 200 colunas.")};"v"->if(inside)value=x.nextText();"t"->if(inside&&type=="inlineStr")value+=x.nextText()}}
    if(x.eventType==XmlPullParser.END_TAG){if(x.name=="c"){inside=false;if(type=="s")value=strings.getOrNull(value.toIntOrNull()?:-1)?:throw Exception("Texto compartilhado inválido.");if(type!="s"&&type!="inlineStr"&&style in dateStyles&&value.toDoubleOrNull()!=null){val serial=value.toDouble();if(!serial.isFinite()||serial<0||serial>2958465)throw Exception("Data da planilha inválida.");val c=Calendar.getInstance(TimeZone.getTimeZone("UTC"));c.clear();c.set(if(epoch1904)1904 else 1899,if(epoch1904)0 else 11,if(epoch1904)1 else 30);c.add(Calendar.DAY_OF_YEAR,serial.toInt());value=String.format(Locale.ROOT,"%04d-%02d-%02d",c.get(Calendar.YEAR),c.get(Calendar.MONTH)+1,c.get(Calendar.DAY_OF_MONTH))}else if(type.isEmpty()||type=="n")value=value.replace('.',',');if(value.length>4000)throw Exception("Célula acima de 4 mil caracteres.");textSize+=value.length;if(textSize>2000000)throw Exception("Conteúdo da planilha acima do limite.");while(row.size<=column)row.add("");row[column]=value};if(x.name=="row"&&row.any{it.isNotBlank()}){rows.put(JSONArray(row));if(rows.length()>10001)throw Exception("Limite de 10 mil lançamentos por aba.")}};x.next()}
   result.put(JSONObject().put("name",name).put("rows",rows))
  };JSONObject().put("sheets",result).toString()
 }
}
