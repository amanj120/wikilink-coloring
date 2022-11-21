# Steps to transforming Wikipedia to redis graph:

* ssh into COC-ICE:
    * `ssh ajain471@coc-ice.pace.gatech.edu`
* request 16 nodes with 16 GB of memory per node for 4 hours:
    * `qsub -I -q coc-ice-long -N cs6235 -l nodes=1:ppn=16,pmem=16gb,walltime=4:00:00`
    * I just ran the entire process with the november 1st dump, and it took almost exactly 4 hours with debugging
        * (3:51)
    * 
* cd into scratch directory
    * `cd /scratch/<job ID>.sched-coc-ice.pace.gatech.edu`
* download the wikipedia dump and index:
    * dump: `wget https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles-multistream.xml.bz2`
    * index: `wget https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles-multistream-index.txt.bz2`
* decompress the index file: `bzip2 -d enwiki-latest-pages-articles-multistream-index.txt.bz2`
* load the correct module for python
    * `module load anaconda3/2021.05`
* run `python3 phase1.py`
    * at this point, you should have:
        * a bunch of files called `outputEdges-<0 - 15>.json`, which contain output edges of nodes
        * a file called `all-redirects.json` which contains all redirects
        * a file called `all-nodes.json` which contains the IDs of all the nodes in the graph
        * a file called `chunkData.json` which contains which articles belong in which chunk in the multistream file (this is a bzip2 thing
        * a file called `pageData.json` which contains a mapping from page name to page ID
* run `python3 phase2.py`
    * this will create one big file called `graph.json` which contains all the nodes' inputs, outputs, and names
* run `python3 phase3.py`
    * at this point, we need to shard the graph so we can process it locally to upload to redis
    * this will create a bunch of `graph-shard-X.json` files, which we bundle up into a tarball and scp to our local machine to be uploaded to redis
* export the graph shards and all-nodes files to the local machine using scp
    * move all files to a directory called `export`
    * `tar -czvf export.tar.gz export/`
    * `mv export.tar.gz ~`
    * and then on the local machine: `scp ajain471@coc-ice.pace.gatech.edu:~/export.tar.gz ~/export.tar.gz`
* upon exporting the tar to your local machine, you can now work on uploading the graph to redis
    * download redis server and start the instance
        * https://redis.io/download/
        * in my case: `brew services start redis`
    * move the export file to the working directory with phase4.ipynb
    * extract the export: `tar -xzvf export.tar.gz`
    * run `python3 phase4.py` to upload graph to redis
* after running phase4, the graph is entirely uploaded to redis, and redis will make sure that the database is saved to a dump file
    * on macOS, the dump is at `/opt/homebrew/var/db/redis/dump.rdb` and can be uploaded to a cloud provider or something as a backup
* now you can run the server: `python3 server.py` to spin up the flask server that will be serving the requests
    * once again, this can be uploaded to a cloud provider or something instead of being run locally
