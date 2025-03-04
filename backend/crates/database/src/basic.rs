use std::borrow::Cow;
use std::collections::HashMap;
use libmdbx::{Database, DatabaseOptions, WriteMap, WriteFlags, TableFlags};

fn open_db(path: &str) -> Result<Database<WriteMap>, libmdbx::Error>{
    let mut options = DatabaseOptions::default();
    options.max_tables = Some(100);
    Database::<WriteMap>::open_with_options(path,options)
}

pub fn write_db(path:&str, key:&str, value: &str, table: &str) -> Result< (), libmdbx::Error>{
    let db = open_db(path)?;
    let transaction = db.begin_rw_txn()?;
    let table = transaction.create_table(Some(table), TableFlags::default())?;
    println!("Hi!");
    let _write_result = transaction.put(&table, key, value, WriteFlags::default())?;
    //TODO! what is the WriteFlags::APPEND?

    transaction.commit()?;

    Ok(())
}

pub fn read_db(path: &str, table: &str) -> Result<HashMap<Vec<u8>, Vec<u8>>, libmdbx::Error> {
    let mut map = HashMap::new();
    let db = open_db(path)?;
    let transaction = db.begin_ro_txn()?;

    if let Ok(table) = transaction.open_table(Some(table)) {
        let cursor = transaction.cursor(&table)?;

        for item in cursor {
            let (key, value) = item?;
            let key_owned = key.to_vec();
            let value_owned = value.to_vec();
            map.insert(key_owned, value_owned);
        }
    }

    Ok(map)
}



//pub fn read_db<'a, 'b>(path:&'a str, table:&'a str) -> Result<  HashMap::<Cow<'b, [u8]> , Cow<'b, [u8]>>, libmdbx::Error>{
//    let mut map = HashMap::<Cow<[u8]> , Cow<[u8]>>::new();
//    let db = open_db(path)?;
//    let transaction = db.begin_ro_txn()?;
//    let table = transaction.open_table(Some(table))?;
//
//    let cursor = transaction.cursor(&table)?;
//
//    for item in cursor {
//        let (key_ , value_) =  item?;
//        map.insert(key_, value_);
//    }
//
//    transaction.commit()?;
//
//
//    Ok(map)
//}  ---> WARNING! : libmdbx using unsafe, so , If we set the lifetime like above,  there will be evoked dangling reference problem.


#[cfg(test)]
mod test{
    use super::*;



    #[test]
    fn write() -> Result< (), libmdbx::Error>{
        write_db("../../","Alice", "Hi!", "CHAT")?;


        write_db("../../","Jake", "Hi!", "CHAT")?;

        let map = read_db("../../",  "CHAT")?;

        map.iter().for_each(|(key, value)| {
            println!("{:?} , {:?}", String::from_utf8_lossy(key), String::from_utf8_lossy(value));
        });

        Ok(())
    }

}